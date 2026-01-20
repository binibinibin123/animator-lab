import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Img, Easing, interpolate, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { Subtitle } from '../components/Subtitle';

export interface Segment {
    id: string;
    video_url?: string | null;
    upscaled_video_url?: string | null; // NEW: upscaled 60fps video
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
    skipSubtitles?: boolean;
}

export const MainVideo: React.FC<MainVideoProps> = ({
    segments,
    subtitleStyle = 'default',
    settings = { padding: 0.5, transitionType: 'slide' },
    skipSubtitles = false
}) => {
    const { fps } = useVideoConfig();
    const { padding, transitionType } = settings;

    // Transition Types for Mixed Mode (deterministic rotation)
    const MIXED_TYPES = ['slide', 'wipe', 'fade'];
    const transitionFramesCount = Math.round(20 * (fps / 30));

    // Pre-calculate segment timings for subtitle layer
    const segmentTimings: Array<{ id: string; from: number; durationInFrames: number; subtitleDuration: number; script_text: string }> = [];
    let calcFrame = 0;
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        let currentTransitionType = transitionType;
        if (transitionType === 'mixed') {
            const mixIndex = (i * 7 + 3) % MIXED_TYPES.length;
            currentTransitionType = MIXED_TYPES[mixIndex];
        }
        const transitionDuration = currentTransitionType === 'none' ? 0 : transitionFramesCount;
        const baseDuration = (seg.duration || 5) + padding;
        const durationInFrames = Math.max(Math.floor(baseDuration * fps), 1) + transitionDuration;

        // Subtitle should NOT overlap - ends before next segment starts
        const isLast = i === segments.length - 1;
        const subtitleDuration = isLast ? durationInFrames : durationInFrames - transitionDuration;

        segmentTimings.push({
            id: seg.id,
            from: calcFrame,
            durationInFrames,
            subtitleDuration,
            script_text: seg.script_text
        });

        if (i < segments.length - 1) {
            calcFrame += durationInFrames - transitionDuration;
        } else {
            calcFrame += durationInFrames;
        }
    }

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* Video/Image Layer (with transitions) */}
            {segments.map((seg, index) => {
                let currentTransitionType = transitionType;
                if (transitionType === 'mixed') {
                    const mixIndex = (index * 7 + 3) % MIXED_TYPES.length;
                    currentTransitionType = MIXED_TYPES[mixIndex];
                }
                const transitionDuration = currentTransitionType === 'none' ? 0 : transitionFramesCount;
                const baseDuration = (seg.duration || 5) + padding;
                const durationInFrames = Math.max(Math.floor(baseDuration * fps), 1) + transitionDuration;
                const from = segmentTimings[index].from;

                return (
                    <Sequence
                        key={seg.id}
                        from={from}
                        durationInFrames={durationInFrames}
                        style={{ zIndex: index }}
                    >
                        <SegmentContainer
                            segment={seg}
                            isFirst={index === 0}
                            transitionDuration={transitionDuration}
                            transitionType={currentTransitionType}
                        />
                    </Sequence>
                );
            })}

            {/* Subtitle Layer (only when not skipping) */}
            {!skipSubtitles && (
                <AbsoluteFill style={{ zIndex: 1000, pointerEvents: 'none' }}>
                    {segmentTimings.map((timing) => (
                        <Sequence
                            key={`sub-${timing.id}`}
                            from={timing.from}
                            durationInFrames={timing.subtitleDuration}
                        >
                            {timing.script_text && (
                                <Subtitle text={timing.script_text} styleName={subtitleStyle} />
                            )}
                        </Sequence>
                    ))}
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};

const SegmentContainer: React.FC<{
    segment: Segment;
    isFirst: boolean;
    transitionDuration: number;
    transitionType: string;
}> = ({ segment, isFirst, transitionDuration, transitionType }) => {
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
                [0, 10, 0],
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

    // Priority: upscaled_video_url > video_url
    const videoSrc = segment.upscaled_video_url || segment.video_url;

    return (
        <AbsoluteFill style={{ ...style, filter }}>
            <AbsoluteFill>
                {videoSrc ? (
                    <OffthreadVideo
                        src={videoSrc}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : segment.image_url ? (
                    <Img
                        src={segment.image_url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : null}
            </AbsoluteFill>

            {segment.audio_url && <Audio src={segment.audio_url} />}
        </AbsoluteFill>
    );
};
