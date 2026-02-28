import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './compositions/MainVideo';
import { z } from 'zod';

const segmentSchema = z.object({
    id: z.string(),
    video_url: z.string().optional().nullable(),
    upscaled_video_url: z.string().optional().nullable(), // NEW: upscaled video
    audio_url: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    script_text: z.string(),
    duration: z.number(),
});

const settingsSchema = z.object({
    padding: z.number().optional(),
    transitionType: z.string().optional(),
});

export const myCompSchema = z.object({
    segments: z.array(segmentSchema),
    subtitleStyle: z.string().optional(),
    settings: settingsSchema.optional(),
    fps: z.number().optional(),
    skipSubtitles: z.boolean().optional(),
    isShortsMode: z.boolean().optional(),
    renderStrategy: z.enum(['native', 'reframe_portrait']).optional(),
    title: z.string().optional(),
});

// Dynamic duration and FPS calculation
const calculateMetadata = ({ props }: { props: z.infer<typeof myCompSchema> }) => {
    const { segments, settings, fps: inputFps, isShortsMode } = props;
    const padding = settings?.padding ?? 0.5;
    const transitionType = settings?.transitionType ?? 'slide';
    const fps = inputFps ?? 30;
    const transitionFrames = transitionType === 'none' ? 0 : Math.round(20 * (fps / 30));

    let totalFrames = 0;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const durationWithPadding = (seg.duration || 3) + padding;
        const segmentFrames = Math.max(Math.floor(durationWithPadding * fps), 1) + transitionFrames;
        totalFrames += segmentFrames;
    }

    if (segments.length > 1) {
        totalFrames -= transitionFrames * (segments.length - 1);
    }
    totalFrames += transitionFrames;

    return {
        durationInFrames: totalFrames || 300,
        fps, // Dynamic FPS
        width: isShortsMode ? 1080 : 1920,
        height: isShortsMode ? 1920 : 1080,
    };
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="MainVideo"
                component={MainVideo as any}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
                schema={myCompSchema}
                calculateMetadata={calculateMetadata}
                defaultProps={{
                    segments: [],
                    settings: { padding: 0.5, transitionType: 'slide' },
                    fps: 30,
                    renderStrategy: 'native',
                }}
            />
        </>
    );
};
