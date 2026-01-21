import { CSSProperties } from 'react';

export interface SubtitleStyle {
    name: string;
    container: CSSProperties;
    text: CSSProperties;
}

export const SUBTITLE_STYLES: Record<string, SubtitleStyle> = {
    default: {
        name: 'Default',
        container: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 100,
        },
        text: {
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
            textWrap: 'balance',
        },
    },
    youtuber: {
        name: 'Youtuber',
        container: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 120,
        },
        text: {
            color: '#FFFF00', // Yellow
            fontSize: 70,
            fontWeight: 900,
            textAlign: 'center',
            maxWidth: '90%',
            textShadow: '-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000', // Bold outline
            fontFamily: 'Impact, sans-serif',
            textTransform: 'uppercase',
            transform: 'rotate(-2deg)',
            textWrap: 'balance',
        },
    },
    clean: {
        name: 'Clean',
        container: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 80,
        },
        text: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: 40,
            fontWeight: 600,
            textAlign: 'center',
            maxWidth: '70%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontFamily: 'Helvetica, Arial, sans-serif',
            textWrap: 'balance',
        },
    },
    neon: {
        name: 'Neon',
        container: {
            justifyContent: 'center',
            alignItems: 'center', // Center of screen for neon impact? Or bottom? Let's keep bottom for subtitles
            paddingBottom: 100,
        },
        text: {
            color: '#fff',
            fontSize: 60,
            fontWeight: 'bold',
            textAlign: 'center',
            maxWidth: '80%',
            textShadow: '0 0 10px #ff00de, 0 0 20px #ff00de, 0 0 40px #ff00de', // Neon pink glow
            fontFamily: 'Courier New, monospace',
            letterSpacing: '2px',
            textWrap: 'balance',
        },
    },
    cinematic: {
        name: 'Cinematic',
        container: {
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 50, // Lower
        },
        text: {
            color: '#e0e0e0',
            fontSize: 36,
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '80%',
            textShadow: '1px 1px 2px black',
            fontFamily: 'Georgia, serif',
            letterSpacing: '1px',
            fontStyle: 'italic',
            textWrap: 'balance',
        },
    },
    viral_red: {
        name: 'Viral (Red)',
        container: {
            justifyContent: 'center',
            alignItems: 'center', // Center for maximum impact
            paddingBottom: 200, // Higher up
        },
        text: {
            color: '#FFFFFF',
            backgroundColor: '#FF0000',
            padding: '10px 30px',
            fontSize: 80,
            fontWeight: 900,
            textAlign: 'center',
            maxWidth: '90%',
            textShadow: '4px 4px 0 #000000',
            fontFamily: 'Impact, sans-serif',
            textTransform: 'uppercase',
            transform: 'rotate(2deg)',
            boxShadow: '8px 8px 0 rgba(0,0,0,0.8)',
            textWrap: 'balance',
        },
    },
};
