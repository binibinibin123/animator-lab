import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

import type { VideoProvider } from '@/lib/video/VideoProvider';
import { getVideoProvider } from '@/lib/video/VideoProvider';
import {
    listEnabledVideoModels,
    resolveVideoDuration,
    resolveVideoResolution,
    VIDEO_MODEL_REGISTRY,
    type VideoModelId,
} from '@/lib/models/registry';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const REQUESTED_DURATION_SECONDS = 1;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 90;
const SAMPLE_IMAGE_FILE_PATH = path.resolve(process.cwd(), 'public/styles/illustration.png');

interface ModelTestResult {
    modelId: VideoModelId;
    endpoint: string;
    requestedDurationSeconds: number;
    resolvedDurationSeconds: number;
    resolution: string;
    externalJobId?: string;
    status: 'succeeded' | 'failed' | 'cancelled' | 'timeout' | 'submit_failed';
    videoUrl?: string;
    error?: string;
    elapsedMs: number;
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadSampleImageDataUrl(): Promise<string> {
    const imageBuffer = await fs.readFile(SAMPLE_IMAGE_FILE_PATH);
    const base64 = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
}

async function runSingleModelTest(options: {
    provider: VideoProvider;
    modelId: VideoModelId;
    imageUrl: string;
}): Promise<ModelTestResult> {
    const { provider, modelId, imageUrl } = options;
    const modelConfig = VIDEO_MODEL_REGISTRY[modelId];
    const resolvedDurationSeconds = resolveVideoDuration(modelId, REQUESTED_DURATION_SECONDS);
    const resolution = resolveVideoResolution(modelId);
    const start = Date.now();

    let externalJobId: string | undefined;

    try {
        const submitResult = await provider.submitJob({
            imageUrl,
            motionPrompt: 'Locked camera, subtle ambient motion, clean cinematic look.',
            duration: REQUESTED_DURATION_SECONDS,
            modelId,
            resolution,
            segmentId: `video-model-test-${modelId}`,
        });
        externalJobId = submitResult.externalJobId;
    } catch (error) {
        return {
            modelId,
            endpoint: modelConfig.endpoint,
            requestedDurationSeconds: REQUESTED_DURATION_SECONDS,
            resolvedDurationSeconds,
            resolution,
            status: 'submit_failed',
            error: toErrorMessage(error),
            elapsedMs: Date.now() - start,
        };
    }

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        const statusResult = await provider.checkStatus(externalJobId, modelId);
        if (statusResult.status === 'succeeded') {
            return {
                modelId,
                endpoint: modelConfig.endpoint,
                requestedDurationSeconds: REQUESTED_DURATION_SECONDS,
                resolvedDurationSeconds,
                resolution,
                externalJobId,
                status: 'succeeded',
                videoUrl: statusResult.videoUrl,
                elapsedMs: Date.now() - start,
            };
        }

        if (statusResult.status === 'failed' || statusResult.status === 'cancelled') {
            return {
                modelId,
                endpoint: modelConfig.endpoint,
                requestedDurationSeconds: REQUESTED_DURATION_SECONDS,
                resolvedDurationSeconds,
                resolution,
                externalJobId,
                status: statusResult.status,
                error: statusResult.error,
                elapsedMs: Date.now() - start,
            };
        }

        await sleep(POLL_INTERVAL_MS);
    }

    return {
        modelId,
        endpoint: modelConfig.endpoint,
        requestedDurationSeconds: REQUESTED_DURATION_SECONDS,
        resolvedDurationSeconds,
        resolution,
        externalJobId,
        status: 'timeout',
        error: `No terminal status after ${MAX_POLL_ATTEMPTS} polls`,
        elapsedMs: Date.now() - start,
    };
}

async function main(): Promise<void> {
    if (!process.env.FAL_KEY) {
        throw new Error('FAL_KEY is missing in .env.local');
    }

    const provider = getVideoProvider('fal');
    const sampleImageDataUrl = await loadSampleImageDataUrl();
    const models = listEnabledVideoModels().map((model) => model.id);

    if (models.length === 0) {
        throw new Error('No enabled video models found in registry');
    }

    console.log('=== Video Model 1s Generation Test ===');
    console.log(`Models: ${models.join(', ')}`);
    console.log(`Requested duration per model: ${REQUESTED_DURATION_SECONDS}s`);
    console.log('--------------------------------------');

    const results: ModelTestResult[] = [];

    for (const modelId of models) {
        console.log(`\n[${modelId}] submit + poll start`);
        const result = await runSingleModelTest({
            provider,
            modelId,
            imageUrl: sampleImageDataUrl,
        });
        results.push(result);

        console.log(
            `[${modelId}] status=${result.status} requested=${result.requestedDurationSeconds}s resolved=${result.resolvedDurationSeconds}s resolution=${result.resolution}`
        );
        if (result.error) {
            console.log(`[${modelId}] error=${result.error}`);
        }
    }

    const failed = results.filter((result) => result.status !== 'succeeded');

    console.log('\n=== Summary ===');
    for (const result of results) {
        console.log(
            `${result.modelId} | ${result.status} | req=${result.requestedDurationSeconds}s -> resolved=${result.resolvedDurationSeconds}s | ${result.elapsedMs}ms`
        );
    }

    if (failed.length > 0) {
        process.exitCode = 1;
    }
}

void main().catch((error: unknown) => {
    console.error('[test_video_models_1s] failed:', toErrorMessage(error));
    process.exit(1);
});
