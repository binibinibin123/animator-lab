import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Subtitle: React.FC<{ text: string }> = ({ text }) => {
    return (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 100 }}>
            <div
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '20px 40px',
                    borderRadius: '20px',
                    fontSize: 50,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    maxWidth: '80%',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontFamily: 'sans-serif',
                }}
            >
                {text}
            </div>
        </AbsoluteFill>
    );
};
