import type { VideoProvider, VideoJobStatus, VideoGenerationRequest } from './VideoProvider';
import { createServerClient } from '@/lib/supabase';
import { WORKFLOWS, WorkflowId } from './workflows';

const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188';

interface ComfyUIHistoryOutput {
    images?: Array<{ filename: string; subfolder: string; type: string }>;
    gifs?: Array<{ filename: string; subfolder: string; type: string }>;
    videos?: Array<{ filename: string; subfolder: string; type: string }>;
}

interface ComfyUIHistoryEntry {
    status: { status_str: string; completed: boolean; messages: string[][] };
    outputs: Record<string, ComfyUIHistoryOutput>;
}

export class ComfyUIVideoProvider implements VideoProvider {
    readonly name = 'comfyui' as const;

    async submitJob(request: VideoGenerationRequest): Promise<{ externalJobId: string }> {
        const { imageUrl, motionPrompt, workflowId } = request;
        const selectedWorkflowId = (workflowId as WorkflowId) || 'lf-i2v-v1.1';

        console.log(`[ComfyUIVideoProvider] Submitting job with prompt: ${motionPrompt} (Workflow: ${selectedWorkflowId})`);

        // 1. Upload source image to ComfyUI
        const uploadedFilename = await this.uploadSourceImage(imageUrl);
        console.log(`[ComfyUIVideoProvider] Image uploaded to ComfyUI: ${uploadedFilename}`);

        // 2. Load and inject workflow template
        const workflow = await this.buildWorkflow(uploadedFilename, motionPrompt, selectedWorkflowId);

        // 3. Submit to ComfyUI
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

    private static uploadingJobs = new Set<string>();

    async checkStatus(externalJobId: string): Promise<{
        status: VideoJobStatus;
        progress: number;
        videoUrl?: string;
        error?: string;
    }> {
        try {
            // Prevent multiple upload requests for the same job
            if (ComfyUIVideoProvider.uploadingJobs.has(externalJobId)) {
                console.log(`[ComfyUIVideoProvider] Job ${externalJobId} is currently uploading. Skipping duplicate check.`);
                return { status: 'running', progress: 0.99 }; // Indicate mostly done
            }

            console.log(`[ComfyUIVideoProvider] Checking status: ${externalJobId}`);

            // Get history from ComfyUI
            const response = await fetch(`${COMFYUI_BASE_URL}/history/${externalJobId}`);

            if (!response.ok) {
                // Job might still be queued OR deleted
                // We must verify with /queue endpoint
                if (response.status === 404) {
                    try {
                        const queueRes = await fetch(`${COMFYUI_BASE_URL}/queue`);
                        if (queueRes.ok) {
                            const queueData = await queueRes.json();
                            // Check running
                            const isRunning = queueData.queue_running?.some((item: any) => item[1] === externalJobId);
                            // Check pending
                            const isPending = queueData.queue_pending?.some((item: any) => item[1] === externalJobId);

                            if (isRunning) return { status: 'running', progress: 0.1 };
                            if (isPending) return { status: 'queued', progress: 0 };

                            // Not in history, not in queue => It's gone (deleted or failed silently)
                            console.warn(`[ComfyUIVideoProvider] Job ${externalJobId} not found in history or queue.`);
                            return { status: 'failed', progress: 0, error: 'Job not found (possibly deleted)' };
                        }
                    } catch (qErr) {
                        console.warn('Failed to check queue:', qErr);
                    }

                    // Fallback if queue check fails
                    return { status: 'queued', progress: 0 };
                }
                throw new Error(`Failed to get history: ${response.status}`);
            }

            const history = await response.json();
            const entry = history[externalJobId] as ComfyUIHistoryEntry | undefined;

            if (!entry) {
                // Double check queue
                try {
                    const queueRes = await fetch(`${COMFYUI_BASE_URL}/queue`);
                    if (queueRes.ok) {
                        const queueData = await queueRes.json();
                        const isRunning = queueData.queue_running?.some((item: any) => item[1] === externalJobId);
                        const isPending = queueData.queue_pending?.some((item: any) => item[1] === externalJobId);

                        if (isRunning) return { status: 'running', progress: 0.1 };
                        if (isPending) return { status: 'queued', progress: 0 };
                    }
                } catch (e) { }

                return { status: 'failed', progress: 0, error: 'Job entry invalid' };
            }

            // Check if completed
            if (entry.status?.completed) {
                console.log(`[ComfyUIVideoProvider] Job completed. Outputs:`, JSON.stringify(entry.outputs));

                // Find output video/gif file
                // Search for any node output that has videos or gifs
                const outputNodeId = Object.keys(entry.outputs).find(
                    key => entry.outputs[key]?.videos?.length || entry.outputs[key]?.gifs?.length || entry.outputs[key]?.images?.length
                );

                if (outputNodeId) {
                    const outputs = entry.outputs[outputNodeId];
                    const file = outputs.videos?.[0] || outputs.gifs?.[0] || outputs.images?.[0];

                    if (file) {
                        try {
                            ComfyUIVideoProvider.uploadingJobs.add(externalJobId);

                            // Construct local file URL
                            const localUrl = `${COMFYUI_BASE_URL}/view?filename=${file.filename}&subfolder=${file.subfolder}&type=${file.type}`;

                            console.log(`[ComfyUIVideoProvider] Uploading output to cloud: ${file.filename}`);

                            // Upload to Supabase Storage
                            const publicUrl = await this.uploadToStorage(localUrl, file.filename);

                            console.log(`[ComfyUIVideoProvider] Upload completed! URL: ${publicUrl}`);

                            return {
                                status: 'succeeded',
                                progress: 1,
                                videoUrl: publicUrl,
                            };
                        } catch (uploadError: any) {
                            console.error(`[ComfyUIVideoProvider] Upload failed:`, uploadError);
                            return {
                                status: 'failed',
                                progress: 1,
                                error: `Upload failed: ${uploadError.message}`,
                            };
                        } finally {
                            ComfyUIVideoProvider.uploadingJobs.delete(externalJobId);
                        }
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

    async cancelJob(externalJobId: string): Promise<boolean> {
        try {
            console.log(`[ComfyUIVideoProvider] Attempting cancellation for job: ${externalJobId}`);

            // 1. Check if it's in the pending queue
            const queueRes = await fetch(`${COMFYUI_BASE_URL}/queue`);
            if (queueRes.ok) {
                const queueData = await queueRes.json();

                // Check pending items (format: [id, prompt_id, ...])
                const isPending = queueData.queue_pending?.some((item: any) => item[1] === externalJobId);

                if (isPending) {
                    console.log(`[ComfyUIVideoProvider] Deleting job from pending queue: ${externalJobId}`);
                    // Delete from queue
                    const deleteRes = await fetch(`${COMFYUI_BASE_URL}/queue`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ delete: [externalJobId] })
                    });

                    if (deleteRes.ok) return true;
                }
            }

            // 2. If it wasn't pending or delete failed, try interrupt (incase it's running)
            console.log(`[ComfyUIVideoProvider] Interrupting ComfyUI execution (if running).`);
            const response = await fetch(`${COMFYUI_BASE_URL}/interrupt`, {
                method: 'POST',
            });

            if (!response.ok) {
                console.warn(`[ComfyUIVideoProvider] Failed to interrupt ComfyUI: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[ComfyUIVideoProvider] Cancel error:', error);
            return false;
        }
    }

    private async uploadSourceImage(imageUrl: string): Promise<string> {
        try {
            // 1. Fetch image from URL
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
            const imageBlob = await imageResponse.blob();

            // 2. Prepare Form Data
            const formData = new FormData();
            // ComfyUI expects 'image' field. Filename prevents conflicts.
            const filename = `upload_${Date.now()}.png`;
            formData.append('image', imageBlob, filename);
            formData.append('overwrite', 'true');

            // 3. Upload to ComfyUI
            const uploadResponse = await fetch(`${COMFYUI_BASE_URL}/upload/image`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const text = await uploadResponse.text();
                throw new Error(`ComfyUI upload failed: ${text}`);
            }

            const result = await uploadResponse.json();
            // ComfyUI returns { name: string, subfolder: string, type: string }
            // We usually just need the name if subfolder is empty, or "subfolder/name"
            return result.name;

        } catch (error) {
            console.error('[ComfyUIVideoProvider] Failed to upload source image:', error);
            throw error;
        }
    }

    private async buildWorkflow(imageFilename: string, motionPrompt: string, workflowId: WorkflowId): Promise<Record<string, any>> {
        const workflowConfig = WORKFLOWS[workflowId];
        if (!workflowConfig) {
            throw new Error(`Unknown workflow ID: ${workflowId}`);
        }

        // Clone the template
        const workflow = JSON.parse(JSON.stringify(workflowConfig.workflow)) as Record<string, any>;

        if (workflowId === 'lf-i2v-v1.1') {
            // LF i2v injection

            // Node 55: Input Image
            if (workflow["55"] && workflow["55"].inputs) {
                workflow["55"].inputs.image = imageFilename;
            }

            // Node 89: Positive Prompt
            if (workflow["89"] && workflow["89"].inputs) {
                workflow["89"].inputs.value = motionPrompt || "Static scene, subtle motion";
            }

            // Node 135: Seed
            if (workflow["135"] && workflow["135"].inputs) {
                workflow["135"].inputs.seed = Math.floor(Math.random() * 100000000000000); // Large random integer
            }

            // Node 162: Video Combine name prefix
            if (workflow["162"] && workflow["162"].inputs) {
                workflow["162"].inputs.filename_prefix = `autovideo_${Date.now()}`;
            }

        } else if (workflowId === 'ltx-video-default') {
            // LTX Video injection (nodes 1, 3, 4, 5)

            // Node 1: Load Image
            if (workflow["1"] && workflow["1"].inputs) {
                workflow["1"].inputs.image = imageFilename;
            }

            // Node 3: Conditioning
            if (workflow["3"] && workflow["3"].inputs) {
                workflow["3"].inputs.positive = motionPrompt || "camera movement";
            }

            // Node 4: Sampler (Seed)
            if (workflow["4"] && workflow["4"].inputs) {
                workflow["4"].inputs.seed = Math.floor(Math.random() * 1000000);
            }

            // Node 5: Video Combine
            if (workflow["5"] && workflow["5"].inputs) {
                workflow["5"].inputs.filename_prefix = `autovideo_ltx_${Date.now()}`;
            }

        } else if (workflowId === 'rapid-aio-mega') {
            // Rapid AIO Mega injection

            // Node 16: Input Image
            if (workflow["16"] && workflow["16"].inputs) {
                workflow["16"].inputs.image = imageFilename;
            }

            // Node 9: Positive Prompt
            if (workflow["9"] && workflow["9"].inputs) {
                workflow["9"].inputs.text = motionPrompt || "High quality video";
            }

            // Node 8: KSampler (Seed)
            if (workflow["8"] && workflow["8"].inputs) {
                workflow["8"].inputs.seed = Math.floor(Math.random() * 100000000000000);
            }

            // Node 39: Video Combine name prefix
            if (workflow["39"] && workflow["39"].inputs) {
                workflow["39"].inputs.filename_prefix = `autovideo_rapid_${Date.now()}`;
            }

        } else if (workflowId === 'rapid-aio-mega-sage') {
            // Rapid AIO Mega + Sage injection (same node structure)

            // Node 16: Input Image
            if (workflow["16"] && workflow["16"].inputs) {
                workflow["16"].inputs.image = imageFilename;
            }

            // Node 9: Positive Prompt
            if (workflow["9"] && workflow["9"].inputs) {
                workflow["9"].inputs.text = motionPrompt || "High quality video";
            }

            // Node 8: KSampler (Seed)
            if (workflow["8"] && workflow["8"].inputs) {
                workflow["8"].inputs.seed = Math.floor(Math.random() * 100000000000000);
            }

            // Node 39: Video Combine name prefix
            if (workflow["39"] && workflow["39"].inputs) {
                workflow["39"].inputs.filename_prefix = `autovideo_rapid_sage_${Date.now()}`;
            }
        } else if (workflowId === 'rapid-aio-mega-sage-2') {
            // Rapid AIO Mega + Sage v2 injection (same node structure as sage)

            // Node 16: Input Image
            if (workflow["16"] && workflow["16"].inputs) {
                workflow["16"].inputs.image = imageFilename;
            }

            // Node 9: Positive Prompt
            if (workflow["9"] && workflow["9"].inputs) {
                workflow["9"].inputs.text = motionPrompt || "High quality video";
            }

            // Node 8: KSampler (Seed)
            if (workflow["8"] && workflow["8"].inputs) {
                workflow["8"].inputs.seed = Math.floor(Math.random() * 100000000000000);
            }

            // Node 39: Video Combine name prefix
            if (workflow["39"] && workflow["39"].inputs) {
                workflow["39"].inputs.filename_prefix = `autovideo_rapid_sage2_${Date.now()}`;
            }
        }

        return workflow;
    }

    private async uploadToStorage(localUrl: string, filename: string): Promise<string> {
        const MAX_RETRIES = 3;
        let lastError: any;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                // Fetch file from ComfyUI
                const response = await fetch(localUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file from ComfyUI: ${response.status}`);
                }

                const blob = await response.blob();
                const buffer = Buffer.from(await blob.arrayBuffer());

                // Upload to Supabase Storage
                const supabase = createServerClient();
                const extension = filename.split('.').pop() || 'mp4';
                const storagePath = `videos/${Date.now()}_${filename}`;

                const { error } = await supabase.storage
                    .from('autovideo-media')
                    .upload(storagePath, buffer, {
                        contentType: extension === 'mp4' ? 'video/mp4' : 'video/webm',
                        upsert: true,
                    });

                if (error) {
                    throw error;
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('autovideo-media')
                    .getPublicUrl(storagePath);

                console.log(`[ComfyUIVideoProvider] Successfully uploaded to cloud: ${publicUrl}`);
                return publicUrl;
            } catch (error: any) {
                lastError = error;
                console.error(`[ComfyUIVideoProvider] Upload attempt ${attempt + 1} failed:`, error.message);
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // Exponential backoff
                }
            }
        }

        console.error('[ComfyUIVideoProvider] All upload attempts failed. Last error:', lastError);
        // We throw instead of returning localUrl to ensure consistency across devices.
        // If it's not in the cloud, it's not "done" for a 10-minute project.
        throw new Error(`Cloud upload failed after ${MAX_RETRIES} attempts. Please check Supabase Pro status and bucket 'autovideo-media'. Original error: ${lastError?.message}`);
    }
}
