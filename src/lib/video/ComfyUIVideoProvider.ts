// ComfyUIVideoProvider - Local ComfyUI implementation
// Uses ComfyUI REST API for video generation with LTX-Video workflow

import type { VideoProvider, VideoJobStatus, VideoGenerationRequest } from './VideoProvider';
import { createServerClient } from '@/lib/supabase';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188';

interface ComfyUIHistoryOutput {
    images?: Array<{ filename: string; subfolder: string; type: string }>;
    gifs?: Array<{ filename: string; subfolder: string; type: string }>;
}

interface ComfyUIHistoryEntry {
    status: { status_str: string; completed: boolean; messages: string[][] };
    outputs: Record<string, ComfyUIHistoryOutput>;
}

export class ComfyUIVideoProvider implements VideoProvider {
    readonly name = 'comfyui' as const;

    async submitJob(request: VideoGenerationRequest): Promise<{ externalJobId: string }> {
        const { imageUrl, motionPrompt } = request;

        console.log(`[ComfyUIVideoProvider] Submitting job with prompt: ${motionPrompt}`);

        // Load and inject workflow template
        const workflow = await this.buildWorkflow(imageUrl, motionPrompt);

        // Submit to ComfyUI
        const response = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ComfyUI submission failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const promptId = result.prompt_id;

        console.log(`[ComfyUIVideoProvider] Job submitted: ${promptId}`);

        return { externalJobId: promptId };
    }

    async checkStatus(externalJobId: string): Promise<{
        status: VideoJobStatus;
        progress: number;
        videoUrl?: string;
        error?: string;
    }> {
        try {
            console.log(`[ComfyUIVideoProvider] Checking status: ${externalJobId}`);

            // Get history from ComfyUI
            const response = await fetch(`${COMFYUI_BASE_URL}/history/${externalJobId}`);

            if (!response.ok) {
                // Job might still be queued
                if (response.status === 404) {
                    return { status: 'queued', progress: 0 };
                }
                throw new Error(`Failed to get history: ${response.status}`);
            }

            const history = await response.json();
            const entry = history[externalJobId] as ComfyUIHistoryEntry | undefined;

            if (!entry) {
                return { status: 'queued', progress: 0 };
            }

            // Check if completed
            if (entry.status?.completed) {
                // Find output video file
                const outputNodeId = Object.keys(entry.outputs).find(
                    key => entry.outputs[key]?.gifs?.length || entry.outputs[key]?.images?.length
                );

                if (outputNodeId) {
                    const outputs = entry.outputs[outputNodeId];
                    const file = outputs.gifs?.[0] || outputs.images?.[0];

                    if (file) {
                        // Construct local file URL or upload to storage
                        const localUrl = `${COMFYUI_BASE_URL}/view?filename=${file.filename}&subfolder=${file.subfolder}&type=${file.type}`;

                        // Upload to Supabase Storage
                        const publicUrl = await this.uploadToStorage(localUrl, file.filename);

                        console.log(`[ComfyUIVideoProvider] Completed! URL: ${publicUrl}`);

                        return {
                            status: 'succeeded',
                            progress: 1,
                            videoUrl: publicUrl,
                        };
                    }
                }

                return {
                    status: 'failed',
                    progress: 1,
                    error: 'No output file found',
                };
            }

            // Still running
            return { status: 'running', progress: 0.5 };
        } catch (error: any) {
            console.error('[ComfyUIVideoProvider] Error:', error);
            return {
                status: 'failed',
                progress: 0,
                error: error.message || 'Unknown error',
            };
        }
    }

    private async buildWorkflow(imageUrl: string, motionPrompt: string): Promise<Record<string, any>> {
        // LTX-Video workflow template
        // This is a simplified template - adjust node IDs based on your actual workflow
        return {
            "1": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": imageUrl,
                    "upload": "image"
                }
            },
            "2": {
                "class_type": "LTXVLoader",
                "inputs": {
                    "ckpt_name": "ltxv_13b_fp8_e4m3fn.safetensors"
                }
            },
            "3": {
                "class_type": "LTXVConditioning",
                "inputs": {
                    "positive": motionPrompt,
                    "negative": "blurry, distorted, low quality, text, watermark",
                    "ltxv": ["2", 0]
                }
            },
            "4": {
                "class_type": "LTXVSampler",
                "inputs": {
                    "seed": Math.floor(Math.random() * 1000000),
                    "steps": 30,
                    "cfg": 7.0,
                    "image": ["1", 0],
                    "ltxv": ["2", 0],
                    "conditioning": ["3", 0],
                    "num_frames": 49,
                    "frame_rate": 24
                }
            },
            "5": {
                "class_type": "VHS_VideoCombine",
                "inputs": {
                    "images": ["4", 0],
                    "frame_rate": 24,
                    "loop_count": 0,
                    "filename_prefix": "autovideo_output",
                    "format": "video/mp4",
                    "pingpong": false,
                    "save_output": true
                }
            }
        };
    }

    private async uploadToStorage(localUrl: string, filename: string): Promise<string> {
        try {
            // Fetch file from ComfyUI
            const response = await fetch(localUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status}`);
            }

            const blob = await response.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());

            // Upload to Supabase Storage
            const supabase = createServerClient();
            const storagePath = `videos/${Date.now()}_${filename}`;

            const { error } = await supabase.storage
                .from('media')
                .upload(storagePath, buffer, {
                    contentType: 'video/mp4',
                    upsert: true,
                });

            if (error) {
                console.error('[ComfyUIVideoProvider] Storage upload error:', error);
                // Fallback to local URL
                return localUrl;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(storagePath);

            return publicUrl;
        } catch (error) {
            console.error('[ComfyUIVideoProvider] Upload failed:', error);
            return localUrl; // Fallback
        }
    }
}
