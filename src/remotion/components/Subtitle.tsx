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

    const containerStyle: React.CSSProperties = {
        display: 'block', // Disable flex to prevent reflow shake
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none'
    };

    const wrapperStyle: React.CSSProperties = isShortsMode
        ? {
            position: 'absolute',
            width: '100%',
            bottom: 'auto',
            top: 1300,
            display: 'flex',
            justifyContent: 'center'
        }
        : {
            position: 'absolute',
            width: '100%',
            bottom: 100,
            display: 'flex',
            justifyContent: 'center'
        };

    return (
        <AbsoluteFill style={containerStyle}>
            <div style={wrapperStyle}>
                <div style={style.text}>
                    {text}
                </div>
            </div>
        </AbsoluteFill>
    );
};
