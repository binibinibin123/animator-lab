'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

const VOICES = [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' as const },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male' as const },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female' as const },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female' as const },
];

export default function VoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].id);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined';

    useEffect(() => {
        if (!isValidProjectId) {
            console.warn('Invalid Project ID in Voice Page');
            return;
        }

        if (projectId) {
            fetchSegments();
        }
    }, [projectId, isValidProjectId]);

    const fetchSegments = async () => {
        setIsLoading(true);
        console.log('Fetching segments for project:', projectId);
        const { data, error } = await supabase
            .from('segments')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        if (error) {
            console.error('Error fetching segments:', error);
        } else {
            console.log('Segments fetched:', data?.length);
            if (data) setSegments(data);
        }
        setIsLoading(false);
    };

    const handleScriptChange = async (id: string, text: string) => {
        setSegments(prev => prev.map(s => s.id === id ? { ...s, script_text: text } : s));

        // Update in background
        await supabase
            .from('segments')
            .update({ script_text: text } as never)
            .eq('id', id);
    };

    const handleGenerateVoice = async (segment: Segment) => {
        setGeneratingId(segment.id);
        try {
            const response = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: segment.script_text,
                    voiceId: selectedVoice,
                    segmentId: segment.id,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate voice');
            const data = await response.json();

            // Update local state
            setSegments(prev => prev.map(s =>
                s.id === segment.id ? { ...s, audio_url: data.audioUrl, duration_ms: data.durationMs } : s
            ));
        } catch (error) {
            console.error('TTS error:', error);
            alert('음성 생성에 실패했습니다.');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleGenerateAll = async () => {
        for (const segment of segments) {
            if (!segment.audio_url) {
                await handleGenerateVoice(segment);
            }
        }
    };

    const handleSplit = async (segmentId: string, text: string, splitIndex: number) => {
        if (splitIndex === 0 || splitIndex === text.length) {
            alert('중간 지점에서 분할해주세요.');
            return;
        }

        try {
            const response = await fetch('/api/segment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'split',
                    segmentId,
                    splitIndex
                }),
            });

            if (!response.ok) throw new Error('Split failed');
            await fetchSegments();
        } catch (error) {
            console.error('Split error:', error);
            alert('분할에 실패했습니다.');
        }
    };

    const handleMerge = async (segmentId: string) => {
        try {
            const response = await fetch('/api/segment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'merge',
                    segmentId
                }),
            });

            if (!response.ok) throw new Error('Merge failed');
            await fetchSegments();
        } catch (error) {
            console.error('Merge error:', error);
            alert('병합에 실패했습니다.');
        }
    };

    const handleDelete = async (segmentId: string) => {
        if (!confirm('이 컷을 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/segment?segmentId=${segmentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Delete failed');
            await fetchSegments();
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleNext = () => {
        if (!isValidProjectId) {
            alert('프로젝트 ID가 유효하지 않습니다.');
            return;
        }
        router.push(`/create/image?projectId=${projectId}`);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">스크립트 & AI 보이스</h2>
                    <p className="text-gray-500 mt-1">각 컷의 스크립트를 편집하고 AI 음성을 생성하세요.</p>
                </div>
                <button
                    onClick={handleGenerateAll}
                    className="px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors"
                >
                    ✨ 전체 음성 생성
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Left: Global Voice Settings */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-gray-50 p-6 rounded-xl border space-y-4">
                        <h3 className="font-semibold text-gray-800">기본 보이스 설정</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {VOICES.map((voice) => (
                                <button
                                    key={voice.id}
                                    onClick={() => setSelectedVoice(voice.id)}
                                    className={`
                                        p-3 rounded-lg border-2 text-left transition-all
                                        ${selectedVoice === voice.id
                                            ? 'border-violet-600 bg-white'
                                            : 'border-transparent bg-gray-100 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{voice.gender === 'male' ? '👨' : '👩'}</span>
                                        <span className="font-medium">{voice.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {voice.gender === 'male' ? '남성' : '여성'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Segments List */}
                <div className="col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">로딩 중...</div>
                    ) : segments.map((segment, index) => (
                        <div key={segment.id} className="p-4 bg-white border rounded-xl shadow-sm space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-violet-600">CUT #{index + 1}</span>
                                    <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                                        <button
                                            onClick={() => {
                                                const textarea = document.getElementById(`textarea-${segment.id}`) as HTMLTextAreaElement;
                                                handleSplit(segment.id, segment.script_text, textarea.selectionStart);
                                            }}
                                            title="커서 위치에서 분할"
                                            className="p-1 hover:bg-white rounded transition-colors text-gray-500 hover:text-violet-600"
                                        >
                                            ✂️
                                        </button>
                                        {index < segments.length - 1 && (
                                            <button
                                                onClick={() => handleMerge(segment.id)}
                                                title="다음 컷과 합치기"
                                                className="p-1 hover:bg-white rounded transition-colors text-gray-500 hover:text-violet-600"
                                            >
                                                🔗
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(segment.id)}
                                            title="컷 삭제"
                                            className="p-1 hover:bg-white rounded transition-colors text-gray-500 hover:text-red-500"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {segment.audio_url && (
                                        <audio src={segment.audio_url} className="h-8" controls />
                                    )}
                                    <button
                                        onClick={() => handleGenerateVoice(segment)}
                                        disabled={generatingId === segment.id}
                                        className={`px-3 py-1 rounded-md text-sm transition-colors ${segment.audio_url
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-violet-600 text-white hover:bg-violet-700'
                                            }`}
                                    >
                                        {generatingId === segment.id ? '생성 중...' : segment.audio_url ? '재생성' : '🎙️ 음성 생성'}
                                    </button>
                                </div>
                            </div>
                            <textarea
                                id={`textarea-${segment.id}`}
                                value={segment.script_text}
                                onChange={(e) => handleScriptChange(segment.id, e.target.value)}
                                className="w-full p-3 bg-gray-50 border-none rounded-lg text-gray-700 resize-none focus:ring-1 focus:ring-violet-300"
                                rows={3}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link
                    href={`/create/script?projectId=${projectId}`}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                    ← 이전 단계
                </Link>
                <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
