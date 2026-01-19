import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './compositions/MainVideo';
import { z } from 'zod';

const segmentSchema = z.object({
    id: z.string(),
    video_url: z.string().optional().nullable(),
    audio_url: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    script_text: z.string(),
    duration: z.number(),
});

export const myCompSchema = z.object({
    segments: z.array(segmentSchema),
});

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="MainVideo"
                component={MainVideo as any}
                durationInFrames={300} // 기본값, 실제 렌더링 시에는 inputProps에 따라 달라짐
                fps={30}
                width={1920}
                height={1080}
                schema={myCompSchema}
                defaultProps={{
                    segments: []
                }}
            />
        </>
    );
};
