import React from 'react';
import { AbsoluteFill, Audio, Video, Img, Easing, interpolate, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { Subtitle } from '../components/Subtitle';

export interface Segment {
    id: string;
    video_url?: string | null;
    audio_url?: string | null;
    image_url?: string | null;
    script_text: string;
    duration: number; // seconds (TTS duration)
}

export interface VideoSettings {
    padding: number;
    transitionType: string;
}

interface MainVideoProps {
    segments: Segment[];
    subtitleStyle?: string;
    settings?: VideoSettings;
}

export const MainVideo: React.FC<MainVideoProps> = ({
    segments,
    subtitleStyle = 'default',
    settings = { padding: 0.5, transitionType: 'slide' }
}) => {
    const { fps } = useVideoConfig();
    const { padding, transitionType } = settings;

    // Transition Duration: 0 for 'none', otherwise 20 frames (0.67s)
    const TRANSITION_DURATION = transitionType === 'none' ? 0 : 20;

    let currentStartFrame = 0;

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {segments.map((seg, index) => {
                // Duration Calculation:
                // We want: Audio Ends -> Padding Time (Silence) -> Transition Starts
                // Overlap (Transition) happens at the end of the segment (technically start of next).
                // So Next Segment Start should be: AudioDuration + Padding.
                // Since Next Start = Current Start + TotalDuration - TransitionDuration
                // Then: Current + Audio + Padding = Current + Total - Transition
                // SO: TotalDuration = Audio + Padding + Transition

                const baseDuration = (seg.duration || 5) + padding;
                const durationInFrames = Math.max(Math.floor(baseDuration * fps), 1) + TRANSITION_DURATION;

                const from = currentStartFrame;

                if (index < segments.length - 1) {
                    currentStartFrame += durationInFrames - TRANSITION_DURATION;
                } else {
                    currentStartFrame += durationInFrames;
                }

                return (
                    <Sequence
                        key={seg.id}
                        from={from}
                        durationInFrames={durationInFrames}
                        style={{ zIndex: index }} // Ensure proper stacking
                    >
                        <SegmentContainer
                            segment={seg}
                            subtitleStyle={subtitleStyle}
                            isFirst={index === 0}
                            transitionDuration={TRANSITION_DURATION}
                            transitionType={transitionType}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

const SegmentContainer: React.FC<{
    segment: Segment;
    subtitleStyle: string;
    isFirst: boolean;
    transitionDuration: number;
    transitionType: string;
}> = ({ segment, subtitleStyle, isFirst, transitionDuration, transitionType }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    // Transition Logic
    let style: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: 'black'
    };

    let filter = 'none';

    if (!isFirst && transitionDuration > 0) {
        const progress = interpolate(
            frame,
            [0, transitionDuration],
            [0, 1],
            {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }
        );

        if (transitionType === 'slide') {
            const translateX = interpolate(progress, [0, 1], [width, 0]);
            style.transform = `translateX(${translateX}px)`;

            // Motion Blur for Slide
            const blur = interpolate(
                frame,
                [0, transitionDuration / 2, transitionDuration],
                [0, 30, 0],
                { extrapolateRight: 'clamp' }
            );
            if (frame < transitionDuration) {
                filter = `blur(${blur}px)`;
            }

        } else if (transitionType === 'fade') {
            style.opacity = progress;

        } else if (transitionType === 'wipe') {
            // Wipe from right to left
            const wipePercent = interpolate(progress, [0, 1], [100, 0]);
            style.clipPath = `inset(0 0 0 ${wipePercent}%)`; // Left wipe: inset(top right bottom left) -> wait, wipe from right means reveals from right? 
            // Usually wipe means new scene covers old scene.
            // Let's do simple Right-to-Left wipe equivalent to slide but without moving pixels
            style.clipPath = `inset(0 0 0 ${100 - (progress * 100)}%)`; // 100% masked (invisible) -> 0% masked (fully visible)
            // Actually `inset(0 0 0 100%)` is full mask (invisible). `inset(0 0 0 0%)` is full visible.
            // So we want to go from 100% to 0% on the right side? No, generally we want to reveal 

            // Let's simulate: New scene enters from Right.
            // Clip path should reveal from Right edge.
            // inset(0 0 0 X%) cuts X% from left.
            // inset(0 X% 0 0) cuts X% from right.

            // Goal: Reveal from Right -> Left.
            // Start: Fully hidden. `inset(0 0 0 100%)` ? No that cuts from left.
            // We want to cut from Left side. `inset(0 0 0 100%)` -> only 0 width visible. `inset(0 0 0 0)` -> full width.
            style.clipPath = `inset(0 ${interpolate(progress, [0, 1], [100, 0])}% 0 0)`;
            // Wait, this cuts from Right. So it reveals from Left.
            // To reveal from Right (like Slide): We want to cut the Left side.
            style.clipPath = `inset(0 0 0 ${interpolate(progress, [0, 1], [100, 0])}%)`;
        }
    }

    return (
        <AbsoluteFill style={{ ...style, filter }}>
            <AbsoluteFill>
                {segment.video_url ? (
                    <Video
                        src={segment.video_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    // Ensure video loops if needed (though Remotion Video doesn't loop by default easily without composition, but usually short segments are fine)
                    // Actually better to let it freeze on last frame or loop if we can.
                    />
                ) : segment.image_url ? (
                    <Img
                        src={segment.image_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : null}
            </AbsoluteFill>

            {segment.audio_url && <Audio src={segment.audio_url} />}

            {segment.script_text && <Subtitle text={segment.script_text} styleName={subtitleStyle} />}
        </AbsoluteFill>
    );
};
