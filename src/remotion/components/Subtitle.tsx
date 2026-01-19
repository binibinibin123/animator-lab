import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SUBTITLE_STYLES } from '../constants/subtitleStyles';

interface SubtitleProps {
    text: string;
    styleName?: string;
}

export const Subtitle: React.FC<SubtitleProps> = ({ text, styleName = 'default' }) => {
    const style = SUBTITLE_STYLES[styleName.toLowerCase()] || SUBTITLE_STYLES['default'];

    return (
        <AbsoluteFill style={style.container}>
            <div style={style.text}>
                {text}
            </div>
        </AbsoluteFill>
    );
};
