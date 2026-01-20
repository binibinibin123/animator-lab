// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import os from 'os';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188';

// Load workflow template
const WORKFLOW_PATH = path.resolve('./docs/simple_video_upscale_2.0_60F_api.json');

interface UpscaleRequest {
    segment_id: string;
    video_url: string;
}

interface ComfyUIHistoryEntry {
    status: { status_str: string; completed: boolean };
    outputs: Record<string, { gifs?: Array<{ filename: string; subfolder: string; type: string }> }>;
}

export async function POST(req: NextRequest) {
    try {
        const body: UpscaleRequest = await req.json();
        const { segment_id, video_url } = body;

        if (!segment_id || !video_url) {
            return NextResponse.json({ error: 'segment_id and video_url required' }, { status: 400 });
        }

        console.log(`[Upscale API] Starting upscale for segment ${segment_id}`);

        // 1. Download video from URL to temp
        const videoResponse = await fetch(video_url);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const tempFilename = `upscale_input_${Date.now()}.mp4`;
        const tempPath = path.join(os.tmpdir(), tempFilename);
        fs.writeFileSync(tempPath, videoBuffer);
        console.log(`[Upscale API] Video downloaded to ${tempPath}`);

        // 2. Upload to ComfyUI input folder
        const comfyFilename = await uploadVideoToComfyUI(tempPath, tempFilename);
        console.log(`[Upscale API] Video uploaded to ComfyUI: ${comfyFilename}`);

        // 3. Load and configure workflow
        const workflowTemplate = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf-8'));
        const workflow = { ...workflowTemplate };

        // Replace dynamic values
        workflow["803"].inputs.video = comfyFilename;
        workflow["272"].inputs.filename_prefix = `upscale/${segment_id}`;

        console.log(`[Upscale API] Workflow configured`);

        // 4. Submit to ComfyUI
        const promptId = await submitJob(workflow);
        console.log(`[Upscale API] Job submitted: ${promptId}`);

        // 5. Poll for completion
        const outputFile = await pollForCompletion(promptId);
        console.log(`[Upscale API] Output ready: ${outputFile.filename}`);

        // 6. Download from ComfyUI and upload to Supabase
        const localUrl = `${COMFYUI_BASE_URL}/view?filename=${outputFile.filename}&subfolder=${outputFile.subfolder}&type=${outputFile.type}`;
        const publicUrl = await uploadToSupabase(localUrl, `upscaled_${segment_id}_${Date.now()}.mp4`);
        console.log(`[Upscale API] Uploaded to Supabase: ${publicUrl}`);

        // 7. Update segment in database
        const supabase = createServerClient();
        const { error: updateError } = await supabase
            .from('segments')
            .update({ upscaled_video_url: publicUrl })
            .eq('id', segment_id);

        if (updateError) {
            console.error('[Upscale API] DB update error:', updateError);
        }

        // Cleanup temp file
        fs.unlinkSync(tempPath);

        return NextResponse.json({
            success: true,
            segment_id,
            upscaled_video_url: publicUrl
        });

    } catch (error: any) {
        console.error('[Upscale API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function uploadVideoToComfyUI(localPath: string, filename: string): Promise<string> {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(localPath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
    formData.append('image', blob, filename);
    formData.append('overwrite', 'true');
    formData.append('subfolder', '');
    formData.append('type', 'input');

    const response = await fetch(`${COMFYUI_BASE_URL}/upload/image`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`ComfyUI upload failed: ${await response.text()}`);
    }

    const result = await response.json();
    return result.name;
}

async function submitJob(workflow: Record<string, any>): Promise<string> {
    const response = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
    });

    if (!response.ok) {
        throw new Error(`ComfyUI submission failed: ${await response.text()}`);
    }

    const result = await response.json();
    return result.prompt_id;
}

async function pollForCompletion(
    promptId: string,
    maxAttempts = 900,  // 30 minutes max for video upscaling (2s interval)
    intervalMs = 2000
): Promise<{ filename: string; subfolder: string; type: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        try {
            const response = await fetch(`${COMFYUI_BASE_URL}/history/${promptId}`);
            if (!response.ok) {
                if (response.status === 404) continue;
                throw new Error(`Failed to get history: ${response.status}`);
            }

            const history = await response.json();
            const entry = history[promptId] as ComfyUIHistoryEntry | undefined;

            if (!entry) continue;

            if (entry.status?.completed) {
                // VHS_VideoCombine outputs to 'gifs' (for videos too)
                const videoCombineOutput = entry.outputs["272"];
                if (videoCombineOutput?.gifs?.[0]) {
                    return videoCombineOutput.gifs[0];
                }

                // Fallback: search all outputs
                for (const nodeId of Object.keys(entry.outputs)) {
                    const output = entry.outputs[nodeId];
                    if (output.gifs?.[0]) {
                        return output.gifs[0];
                    }
                }

                throw new Error('No output video found');
            }
        } catch (error) {
            console.error(`[Upscale API] Poll attempt ${attempt + 1} error:`, error);
        }
    }

    throw new Error('Polling timeout: Video upscaling took too long');
}

async function uploadToSupabase(localUrl: string, filename: string): Promise<string> {
    const supabase = createServerClient();

    // Download from ComfyUI
    const response = await fetch(localUrl);
    if (!response.ok) {
        throw new Error(`Failed to download from ComfyUI: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Upload to Supabase Storage
    const storagePath = `upscaled/${filename}`;
    const { error } = await supabase.storage
        .from('media')
        .upload(storagePath, buffer, {
            contentType: 'video/mp4',
            upsert: true,
        });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath);

    return publicUrl;
}
