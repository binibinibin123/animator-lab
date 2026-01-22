import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SUBTITLE_STYLES } from '../constants/subtitleStyles';

interface SubtitleProps {
    text: string;
    styleName?: string;
    isShortsMode?: boolean;
}

export const Subtitle: React.FC<SubtitleProps> = ({ text, styleName = 'default', isShortsMode = false }) => {
    const style = SUBTITLE_STYLES[styleName.toLowerCase()] || SUBTITLE_STYLES['default'];

    const containerStyle: React.CSSProperties = isShortsMode
        ? {
            ...style.container,
            justifyContent: 'flex-start',
            paddingTop: 1300, // Position just below the centered 16:9 video (Video ends ~1264px)
            paddingBottom: 0,
        }
        : style.container;

    return (
        <AbsoluteFill style={containerStyle}>
            <div style={style.text}>
                {text}
            </div>
        </AbsoluteFill>
    );
};
