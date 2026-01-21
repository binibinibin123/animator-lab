import React from 'react';
import { AbsoluteFill } from 'remotion';

interface TitleProps {
    text: string;
}

export const Title: React.FC<TitleProps> = ({ text }) => {
    return (
        <AbsoluteFill
            style={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: 220,
                width: '100%',
                zIndex: 2000
            }}
        >
            <div style={{
                backgroundColor: '#000000',
                color: '#FFFFFF',
                padding: '24px 60px',
                fontSize: 80,
                fontWeight: 900,
                textAlign: 'center',
                fontFamily: '"Archivo Black", "Arial Black", sans-serif',
                textTransform: 'uppercase',
                maxWidth: '900px',
                lineHeight: 1.2,
                borderRadius: '16px', // Slight rounding for modern feel
                display: 'inline-block',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', // Subtle shadow only
            }}>
                {text}
            </div>
        </AbsoluteFill>
    );
};
