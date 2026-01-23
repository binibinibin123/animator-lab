import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Img, Easing, interpolate, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { Subtitle } from '../components/Subtitle';
import { Title } from '../components/Title';

export interface Segment {
    id: string;
    video_url?: string | null;
    upscaled_video_url?: string | null;
    audio_url?: string | null;
    image_url?: string | null;
    script_text: string;
    duration: number;
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
    isShortsMode?: boolean;
    title?: string;
}

const MIXED_TYPES = ['slide', 'wipe', 'fade'];

const getTiming = (index: number, segments: Segment[], transitionType: string, padding: number, fps: number, transitionFramesCount: number) => {
    let calcFrame = 0;
    let timing: any = null;
    for (let i = 0; i <= index; i++) {
        const seg = segments[i];
        let currentTransitionType = transitionType;
        if (transitionType === 'mixed') {
            const mixIndex = (i * 7 + 3) % MIXED_TYPES.length;
            currentTransitionType = MIXED_TYPES[mixIndex];
        }
        const transitionDuration = currentTransitionType === 'none' ? 0 : transitionFramesCount;
        const baseDuration = (seg.duration || 3) + padding; // Correct default (3s)
        const durationInFrames = Math.max(Math.floor(baseDuration * fps), 1) + transitionDuration;

        if (i === index) {
            timing = { from: calcFrame, durationInFrames, currentTransitionType };
        }
        calcFrame += durationInFrames - transitionDuration;
    }
    return timing;
};

export const MainVideo: React.FC<MainVideoProps> = ({
    segments,
    subtitleStyle = 'default',
    settings = { padding: 0.5, transitionType: 'slide' },
    skipSubtitles = false,
    isShortsMode = false,
    title
}) => {
    const { fps } = useVideoConfig();
    const { padding, transitionType } = settings || { padding: 0.5, transitionType: 'slide' };
    const transitionFramesCount = Math.round(20 * (fps / 30));

    const segmentTimings = (segments || []).map((seg, i) => {
        const timing = getTiming(i, segments, transitionType, padding, fps, transitionFramesCount);
        return {
            ...timing,
            id: seg.id,
            script_text: seg.script_text
        };
    });

    if (!segments || segments.length === 0) return <AbsoluteFill style={{ backgroundColor: 'black' }} />;

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* 1. LAYER: Background Blurred videos (Only for Shorts) */}
            {isShortsMode && segmentTimings.map((timing, index) => (
                <Sequence
                    key={`bg-${timing.id}-${index}`}
                    from={timing.from}
                    durationInFrames={timing.durationInFrames}
                    style={{ zIndex: index }}
                >
                    <SegmentContainer
                        segment={segments[index]}
                        isFirst={index === 0}
                        transitionDuration={timing.currentTransitionType === 'none' ? 0 : transitionFramesCount}
                        transitionType={timing.currentTransitionType}
                        isShortsMode={true}
                        layer="background"
                    />
                </Sequence>
            ))}

            {/* 2. LAYER: Global Dimmer (Only for Shorts) */}
            {isShortsMode && (
                <AbsoluteFill
                    style={{
                        zIndex: 500,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        pointerEvents: 'none'
                    }}
                />
            )}

            {/* 3. LAYER: Main Content Foreground */}
            {segmentTimings.map((timing, index) => (
                <Sequence
                    key={`fg-${timing.id}-${index}`}
                    from={timing.from}
                    durationInFrames={timing.durationInFrames}
                    style={{ zIndex: 1000 + index }}
                >
                    <SegmentContainer
                        segment={segments[index]}
                        isFirst={index === 0}
                        transitionDuration={timing.currentTransitionType === 'none' ? 0 : transitionFramesCount}
                        transitionType={timing.currentTransitionType}
                        isShortsMode={isShortsMode}
                        layer={isShortsMode ? "foreground" : "both"}
                    />
                </Sequence>
            ))}

            {/* 4. Overlays: Title & Subtitles */}
            {isShortsMode && title && (
                <Sequence from={0} durationInFrames={Infinity} style={{ zIndex: 2000, pointerEvents: 'none' }}>
                    <Title text={title} />
                </Sequence>
            )}

            {!skipSubtitles && (
                <AbsoluteFill style={{ zIndex: 3000, pointerEvents: 'none' }}>
                    <SubtitleOverlay
                        timings={segmentTimings}
                        styleName={subtitleStyle || 'default'}
                        isShortsMode={isShortsMode}
                    />
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};

// Subtitle component that swaps exactly at segment boundaries for accurate sync
const SubtitleOverlay: React.FC<{
    timings: any[];
    styleName: string;
    isShortsMode: boolean;
}> = ({ timings, styleName, isShortsMode }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const transitionFramesCount = Math.round(20 * (fps / 30));

    // We use the exact segment start point for subtitle switch (Zero sync-drift)
    const active = timings.find((t, i) => {
        const isLast = i === timings.length - 1;
        const transitionDuration = t.currentTransitionType === 'none' ? 0 : transitionFramesCount;
        const effectiveEnd = isLast ? (t.from + t.durationInFrames) : (t.from + t.durationInFrames - transitionDuration);
        return frame >= t.from && frame < effectiveEnd;
    });

    if (!active || !active.script_text) return null;

    return (
        <Subtitle
            key={active.id}
            text={active.script_text}
            styleName={styleName}
            isShortsMode={isShortsMode}
        />
    );
};

const SegmentContainer: React.FC<{
    segment: Segment;
    isFirst: boolean;
    transitionDuration: number;
    transitionType: string;
    isShortsMode?: boolean;
    layer?: 'background' | 'foreground' | 'both';
}> = ({ segment, isFirst, transitionDuration, transitionType, isShortsMode, layer = 'both' }) => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();

    // Fundamental Stability: No backgrounds, no will-change on static items, no expensive filters
    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
    };

    if (!isFirst && transitionDuration > 0) {
        const progress = interpolate(frame, [0, transitionDuration], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });

        if (transitionType === 'slide') {
            containerStyle.transform = `translateX(${interpolate(progress, [0, 1], [width, 0])}px)`;
            containerStyle.willChange = 'transform';
        } else if (transitionType === 'fade') {
            containerStyle.opacity = progress;
            containerStyle.willChange = 'opacity';
        } else if (transitionType === 'wipe') {
            containerStyle.clipPath = `inset(0 0 0 ${interpolate(progress, [0, 1], [100, 0])}%)`;
        }
    }

    const videoSrc = segment.upscaled_video_url || segment.video_url;
    const renderMedia = (fit: 'cover' | 'contain') => {
        if (videoSrc) return <OffthreadVideo src={videoSrc} style={{ width: '100%', height: '100%', objectFit: fit }} />;
        if (segment.image_url) return <Img src={segment.image_url} style={{ width: '100%', height: '100%', objectFit: fit }} />;
        return null;
    };

    if (isShortsMode) {
        return (
            <AbsoluteFill style={containerStyle}>
                {(layer === 'background' || layer === 'both') && (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: -20, filter: 'blur(30px)', transform: 'scale(1.2)' }}>
                            {renderMedia('cover')}
                        </div>
                    </div>
                )}
                {(layer === 'foreground' || layer === 'both') && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        aspectRatio: '16/9',
                        borderRadius: '12px',
                        overflow: 'hidden'
                        // box-shadow removed because it causes alpha-stacking darkening under subtitles
                    }}>
                        {renderMedia('cover')}
                    </div>
                )}
                {(layer === 'foreground' || layer === 'both') && segment.audio_url && <Audio src={segment.audio_url} />}
            </AbsoluteFill>
        );
    }

    // ORIGINAL (Horizontal) Mode - Rock-Solid Layout
    return (
        <AbsoluteFill style={containerStyle}>
            <div style={{ position: 'absolute', inset: 0 }}>
                {renderMedia('cover')}
            </div>
            {segment.audio_url && <Audio src={segment.audio_url} />}
        </AbsoluteFill>
    );
};
