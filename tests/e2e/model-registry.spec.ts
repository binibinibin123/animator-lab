import { expect, test } from '@playwright/test';
import {
    buildFalVideoInput,
} from '../../src/lib/video/FalVideoProvider';
import {
    getDefaultImageModelId,
    getDefaultVideoModelId,
    IMAGE_MODEL_REGISTRY,
    listVideoModelOptions,
    VIDEO_MODEL_REGISTRY,
} from '../../src/lib/models/registry';

test.describe('Upgraded model registry @mock', () => {
    test('uses GPT Image 2 and LTX 2.3 Fast as defaults @mock', () => {
        const imageRegistry = IMAGE_MODEL_REGISTRY as Record<string, any>;
        const videoRegistry = VIDEO_MODEL_REGISTRY as Record<string, any>;

        expect(getDefaultImageModelId()).toBe('gpt-image-2');
        expect(imageRegistry['gpt-image-2']).toMatchObject({
            provider: 'fal',
            endpoint: 'openai/gpt-image-2',
            editEndpoint: 'openai/gpt-image-2/edit',
            costModeLabel: '표준',
            modelDisplayName: 'GPT Image 2',
            supportsReference: true,
            supportedQualities: ['low', 'medium', 'high'],
        });

        expect(getDefaultVideoModelId()).toBe('ltx-2.3-fast');
        expect(videoRegistry['ltx-2.3-fast']).toMatchObject({
            endpoint: 'fal-ai/ltx-2.3/image-to-video/fast',
            costModeLabel: '기본',
            modelDisplayName: 'LTX-2.3 Fast',
            inputMapping: {
                imageInputKey: 'image_url',
                durationFormat: 'number',
                resolutionInputKey: 'resolution',
                staticInput: { generate_audio: false },
            },
        });
    });

    test('keeps premium fal video models available with explicit labels @mock', () => {
        const videoRegistry = VIDEO_MODEL_REGISTRY as Record<string, any>;

        expect(videoRegistry['grok-imagine-video']).toMatchObject({
            endpoint: 'xai/grok-imagine-video/image-to-video',
            costModeLabel: '가성비',
            modelDisplayName: 'Grok Imagine Video',
        });
        expect(videoRegistry['sora-2']).toMatchObject({
            endpoint: 'fal-ai/sora-2/image-to-video',
            costModeLabel: '프리미엄',
            modelDisplayName: 'Sora 2',
            inputMapping: {
                staticInput: { delete_video: false },
            },
        });
        expect(videoRegistry['veo-3.1-fast']).toMatchObject({
            endpoint: 'fal-ai/veo3.1/fast/image-to-video',
            modelDisplayName: 'Veo 3.1 Fast',
        });
        expect(videoRegistry['kling-v3-standard']).toMatchObject({
            endpoint: 'fal-ai/kling-video/v3/standard/image-to-video',
            modelDisplayName: 'Kling v3 Standard',
            inputMapping: {
                imageInputKey: 'start_image_url',
            },
        });
    });

    test('adds current fal image fallbacks with fal-hosted endpoints @mock', () => {
        const imageRegistry = IMAGE_MODEL_REGISTRY as Record<string, any>;

        expect(imageRegistry['nano-banana-2']).toMatchObject({
            provider: 'fal',
            endpoint: 'fal-ai/nano-banana-2',
            editEndpoint: 'fal-ai/nano-banana-2/edit',
            modelDisplayName: 'Nano Banana 2',
            supportsReference: true,
        });
        expect(imageRegistry['nano-banana-pro']).toMatchObject({
            provider: 'fal',
            endpoint: 'fal-ai/nano-banana-pro',
            editEndpoint: 'fal-ai/nano-banana-pro/edit',
            modelDisplayName: 'Nano Banana Pro',
            supportsReference: true,
        });
    });

    test('adds current fal video candidates and maps model-specific input payloads @mock', () => {
        const videoRegistry = VIDEO_MODEL_REGISTRY as Record<string, any>;

        expect(videoRegistry['seedance-2.0-fast']).toMatchObject({
            endpoint: 'bytedance/seedance-2.0/fast/image-to-video',
            modelDisplayName: 'Seedance 2.0 Fast',
            inputMapping: {
                imageInputKey: 'image_url',
                durationFormat: 'number',
                resolutionInputKey: 'resolution',
                staticInput: { generate_audio: false, bitrate_mode: 'standard' },
            },
        });
        expect(videoRegistry['seedance-2.0']).toMatchObject({
            endpoint: 'bytedance/seedance-2.0/image-to-video',
            modelDisplayName: 'Seedance 2.0',
        });
        expect(videoRegistry['veo-3.1-lite']).toMatchObject({
            endpoint: 'fal-ai/veo3.1/lite/image-to-video',
            modelDisplayName: 'Veo 3.1 Lite',
            inputMapping: {
                durationFormat: 'seconds-string',
                staticInput: { generate_audio: false, safety_tolerance: '4' },
            },
        });
        expect(videoRegistry['hailuo-2.3-fast-standard']).toMatchObject({
            endpoint: 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video',
            modelDisplayName: 'Hailuo 2.3 Fast Standard',
            inputMapping: {
                durationFormat: 'string',
                omitResolution: true,
                staticInput: { prompt_optimizer: true },
            },
        });

        const seedanceInput = buildFalVideoInput(videoRegistry['seedance-2.0-fast'], {
            imageUrl: 'https://example.com/start.png',
            motionPrompt: 'slow dolly in',
            duration: 8,
            resolution: '720p',
            aspectRatio: '9:16',
        });
        expect(seedanceInput).toMatchObject({
            prompt: 'slow dolly in',
            image_url: 'https://example.com/start.png',
            duration: 8,
            resolution: '720p',
            aspect_ratio: '9:16',
            generate_audio: false,
            bitrate_mode: 'standard',
        });

        const veoLiteInput = buildFalVideoInput(videoRegistry['veo-3.1-lite'], {
            imageUrl: 'https://example.com/start.png',
            motionPrompt: 'gentle handheld motion',
            duration: 6,
            resolution: '1080p',
            aspectRatio: '16:9',
        });
        expect(veoLiteInput).toMatchObject({
            duration: '6s',
            resolution: '1080p',
            aspect_ratio: '16:9',
            generate_audio: false,
            safety_tolerance: '4',
        });

        const hailuoInput = buildFalVideoInput(videoRegistry['hailuo-2.3-fast-standard'], {
            imageUrl: 'https://example.com/start.png',
            motionPrompt: 'tracking shot',
            duration: 6,
            resolution: '768P',
        });
        expect(hailuoInput).toEqual({
            prompt: 'tracking shot',
            prompt_optimizer: true,
            duration: '6',
            image_url: 'https://example.com/start.png',
        });
    });

    test('does not expose unrelated fallback videos as model samples @mock', () => {
        const enabledVideoModels = Object.values(VIDEO_MODEL_REGISTRY).filter((model) => model.enabled);

        for (const model of enabledVideoModels) {
            expect((model as any).fallbackPreviewVideoUrl, `${model.id} should not use generic sample videos`).toBeUndefined();
        }

        const options = listVideoModelOptions();
        for (const option of options) {
            expect(option.previewVideoUrl, `${option.id} should only get videos from curated or official preview sources`).toBeUndefined();
            expect((option as any).fallbackPreviewVideoUrl, `${option.id} should not expose fallback preview videos`).toBeUndefined();
            expect(option.previewSource).toBe('reference_placeholder');
            expect((option as any).previewSourceLabel).toContain('모델 출력 아님');
        }
    });
});
