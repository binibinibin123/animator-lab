'use client';

import { useState, useEffect, useRef } from 'react';

export interface Voice {
    voiceId: string;
    name: string;
    category: string;
    previewUrl?: string;
}

interface VoiceSelectorProps {
    selectedVoiceId: string | null;
    onSelect: (voiceId: string) => void;
    className?: string;
}

export default function VoiceSelector({ selectedVoiceId, onSelect, className = '' }: VoiceSelectorProps) {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchVoices();

        // Cleanup audio on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const fetchVoices = async () => {
        try {
            const response = await fetch('/api/voices');
            if (!response.ok) throw new Error('Failed to fetch voices');
            const data = await response.json();
            const voiceList: Voice[] = data.voices || [];

            setVoices(voiceList);

            // If no voice is selected and we have voices, select the first one
            // NOTE: We only do this if the parent explicitly passed null (meaning "no selection yet")
            // But we should be careful not to override if parent intended null.
            // However, typically we want a default.
            if (voiceList.length > 0 && !selectedVoiceId) {
                onSelect(voiceList[0].voiceId);
            }
        } catch (error) {
            console.error('Error fetching voices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const playPreview = (voiceId: string, url: string | undefined) => {
        if (!url) return;

        if (playingPreviewId === voiceId) {
            audioRef.current?.pause();
            setPlayingPreviewId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        audioRef.current = new Audio(url);
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(console.error);
        setPlayingPreviewId(voiceId);

        audioRef.current.onended = () => setPlayingPreviewId(null);
    };

    return (
        <div className={`bg-gray-50 p-6 rounded-xl border space-y-4 ${className}`}>
            <h3 className="font-semibold text-gray-800">
                AI 보이스 선택 <span className="text-xs text-gray-500">({voices.length}개)</span>
            </h3>

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : voices.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">사용 가능한 보이스가 없습니다.</p>
                ) : (
                    voices.map((voice) => {
                        const isSelected = selectedVoiceId === voice.voiceId;
                        const isPlaying = playingPreviewId === voice.voiceId;

                        return (
                            <div
                                key={voice.voiceId}
                                onClick={() => onSelect(voice.voiceId)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                    ? 'bg-violet-100 border-2 border-violet-500'
                                    : 'bg-white border border-gray-200 hover:border-violet-300'
                                    }`}
                            >
                                {/* Preview Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playPreview(voice.voiceId, voice.previewUrl);
                                    }}
                                    disabled={!voice.previewUrl}
                                    type="button" // Prevent form submission if used in form
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm flex-shrink-0 ${!voice.previewUrl
                                        ? 'bg-gray-100 text-gray-300'
                                        : isPlaying
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-200 text-gray-600 hover:bg-violet-200'
                                        }`}
                                >
                                    {isPlaying ? '■' : '▶'}
                                </button>

                                {/* Voice Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{voice.name}</div>
                                    <div className="text-xs text-gray-400">{voice.category}</div>
                                </div>

                                {/* Selected Indicator */}
                                {isSelected && <span className="text-violet-600 font-bold">✓</span>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
