import React from 'react';
import { AbsoluteFill, Audio, Video, Img, Easing, interpolate, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { Subtitle } from '../components/Subtitle';

export interface Segment {
    id: string;
    video_url?: string | null;
    audio_url?: string | null;
    image_url?: string | null;
    script_text: string;
    duration: number; // seconds
}

interface MainVideoProps {
    segments: Segment[];
    subtitleStyle?: string;
}

const TRANSITION_DURATION = 20; // 0.67s at 30fps

export const MainVideo: React.FC<MainVideoProps> = ({ segments, subtitleStyle = 'default' }) => {
    const { fps } = useVideoConfig();

    let currentStartFrame = 0;

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {segments.map((seg, index) => {
                const durationInFrames = Math.max(Math.floor((seg.duration || 5) * fps), 1);
                const from = currentStartFrame;

                // Overlap logic: Next segment starts earlier by TRANSITION_DURATION
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
}> = ({ segment, subtitleStyle, isFirst, transitionDuration }) => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();

    // Entry Transition (Slide In from Right)
    const enterProgress = interpolate(
        frame,
        [0, transitionDuration],
        [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }
    );

    // Simulated Motion Blur (Opacity Trail or pure Blur filter)
    // Blur filter is simplest for "motion blur like effect".
    const blur = interpolate(
        frame,
        [0, transitionDuration / 2, transitionDuration],
        [0, 30, 0],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    const translateX = isFirst ? 0 : interpolate(enterProgress, [0, 1], [width, 0]);

    // Apply blur only during active transition
    const filter = (!isFirst && frame < transitionDuration) ? `blur(${blur}px)` : 'none';

    return (
        <AbsoluteFill style={{
            transform: `translateX(${translateX}px)`,
            filter,
            backgroundColor: 'black'
        }}>
            <AbsoluteFill>
                {segment.video_url ? (
                    <Video
                        src={segment.video_url}
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

            {segment.script_text && <Subtitle text={segment.script_text} styleName={subtitleStyle} />}
        </AbsoluteFill>
    );
};
