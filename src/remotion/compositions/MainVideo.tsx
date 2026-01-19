import React from 'react';
import { AbsoluteFill, Series, Audio, Video, Img } from 'remotion';
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

export const MainVideo: React.FC<MainVideoProps> = ({ segments, subtitleStyle = 'default' }) => {
    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            <Series>
                {segments.map((seg) => {
                    // duration이 없거나 0이면 기본값 5초 (150프레임)
                    const durationInFrames = Math.max(Math.floor((seg.duration || 5) * 30), 1);

                    return (
                        <Series.Sequence key={seg.id} durationInFrames={durationInFrames}>
                            <AbsoluteFill>
                                {seg.video_url ? (
                                    <Video
                                        src={seg.video_url}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : seg.image_url ? (
                                    <Img
                                        src={seg.image_url}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : null}
                            </AbsoluteFill>

                            {seg.audio_url && <Audio src={seg.audio_url} />}

                            {seg.script_text && <Subtitle text={seg.script_text} styleName={subtitleStyle} />}
                        </Series.Sequence>
                    );
                })}
            </Series>
        </AbsoluteFill>
    );
};
