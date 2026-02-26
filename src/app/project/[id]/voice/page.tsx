'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Project, Segment } from '@/types/database';
import VoiceSelector from '@/components/voice/VoiceSelector';


export default function VoicePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [projectVisualMode, setProjectVisualMode] = useState<'legacy' | 'character_fixed' | 'style_fixed'>('legacy');

    const [projectAutopilot, setProjectAutopilot] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchSegments();
            fetchProjectInfo();
        }
    }, [projectId]);

    const fetchProjectInfo = async () => {
        const { data } = await supabase
            .from('projects')
            .select('is_test_run, autopilot_status, visual_mode')
            .eq('id', projectId)
            .single();

        const project = data as Pick<Project, 'is_test_run' | 'autopilot_status' | 'visual_mode'> | null;
        if (project && (project.is_test_run || project.autopilot_status === 'generating')) {
            setProjectAutopilot(true);
        }
        if (project?.visual_mode) {
            setProjectVisualMode(project.visual_mode);
        }
    };

    const fetchSegments = async () => {
        setIsLoading(true);
        try {
            console.log('[VoicePage] Fetching segments for project:', projectId);

            const { data, error } = await supabase
                .from('segments')
                .select('id, project_id, order_index, script_text, audio_url')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (error) {
                console.error('Error fetching segments:', error);
            } else if (data) {
                console.log(`[VoicePage] Loaded ${data.length} segments`);
                setSegments(data);
            }
        } catch (err: any) {
            console.error('[VoicePage] Unexpected fetch error:', err);
        }
        setIsLoading(false);
    };

    // Autopilot Logic
    useEffect(() => {
        const checkAutopilot = async () => {
            const autopilot = searchParams.get('autopilot') === 'true' || projectAutopilot;
            if (!autopilot || isLoading || segments.length === 0) return;

            // Check if all segments have audio
            const allHasAudio = segments.every(s => s.audio_url);

            if (allHasAudio) {
                // Done! Move to next step
                console.log('[Autopilot] Voice generation complete. Moving to Image step...');
                router.push(`/project/${projectId}/image?autopilot=true`);
            } else if (!generatingId) {
                // Not done, trigger generation

                // Wait for voice selection (VoiceSelector selects default automatically)
                if (selectedVoiceId) {
                    console.log('[Autopilot] Triggering auto-generation for voices...');
                    setTimeout(() => handleGenerateAll(selectedVoiceId), 500);
                } else {
                    console.log('[Autopilot] Waiting for voice selection...');
                }
            }
        };

        const timeout = setTimeout(checkAutopilot, 2000);
        return () => clearTimeout(timeout);
    }, [isLoading, segments, selectedVoiceId, generatingId, searchParams, projectId, router, projectAutopilot]);

    const handleScriptChange = async (id: string, text: string) => {
        setSegments(prev => prev.map(s => s.id === id ? { ...s, script_text: text } : s));
        await supabase
            .from('segments')
            .update({ script_text: text } as never)
            .eq('id', id);
    };

    const handleGenerateVoice = async (segment: Segment, overrideVoiceId?: string) => {
        const vid = overrideVoiceId || selectedVoiceId;
        if (!vid) {
            alert('보이스를 선택해주세요.');
            return;
        }

        setGeneratingId(segment.id);
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: segment.script_text,
                    voiceId: vid,
                    segmentId: segment.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || data.error || 'Failed to generate voice');
            }

            await fetchSegments();
        } catch (error: any) {
            console.error('TTS error:', error);
            // alert('음성 생성에 실패했습니다: ' + error.message); // Suppress alert in autopilot if desired, or keep it
        } finally {
            setGeneratingId(null);
        }
    };

    const handleGenerateAll = async (overrideVoiceId?: string) => {
        for (const segment of segments) {
            if (!segment.audio_url) {
                await handleGenerateVoice(segment, overrideVoiceId);
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
                body: JSON.stringify({ action: 'split', segmentId, splitIndex }),
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
                body: JSON.stringify({ action: 'merge', segmentId }),
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
            const response = await fetch(`/api/segment?segmentId=${segmentId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
            await fetchSegments();
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">스크립트 & AI 보이스</h2>
                    <p className="text-gray-500 mt-1">각 컷의 스크립트를 편집하고 AI 음성을 생성하세요.</p>
                    <div className="mt-2">
                        <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                            모드: {projectVisualMode === 'character_fixed' ? '캐릭터 고정' : projectVisualMode === 'style_fixed' ? '스타일 고정' : '레거시'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => handleGenerateAll()}
                    disabled={!selectedVoiceId || segments.length === 0}
                    className="px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                    ✨ 전체 음성 생성
                </button>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Voice List */}
                <div className="col-span-1">
                    <VoiceSelector
                        selectedVoiceId={selectedVoiceId}
                        onSelect={setSelectedVoiceId}
                    />
                </div>

                {/* Segments */}
                <div className="col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">로딩 중...</div>
                    ) : segments.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <p>스크립트가 없습니다.</p>
                            <Link href={`/project/${projectId}/script`} className="text-violet-600 hover:underline">
                                대본 작성 단계로 이동
                            </Link>
                        </div>
                    ) : (
                        segments.map((segment, index) => (
                            <div key={segment.id} className="p-4 bg-white border rounded-xl shadow-sm space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-violet-600">CUT #{index + 1}</span>
                                        <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                                            <button
                                                onClick={() => {
                                                    const ta = document.getElementById(`ta-${segment.id}`) as HTMLTextAreaElement;
                                                    handleSplit(segment.id, segment.script_text, ta?.selectionStart || 0);
                                                }}
                                                className="p-1 hover:bg-white rounded text-gray-500 hover:text-violet-600"
                                            >✂️</button>
                                            {index < segments.length - 1 && (
                                                <button onClick={() => handleMerge(segment.id)} className="p-1 hover:bg-white rounded text-gray-500 hover:text-violet-600">🔗</button>
                                            )}
                                            <button onClick={() => handleDelete(segment.id)} className="p-1 hover:bg-white rounded text-gray-500 hover:text-red-500">🗑️</button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateVoice(segment)}
                                        disabled={generatingId === segment.id || !selectedVoiceId}
                                        className={`px-3 py-1 rounded-md text-sm ${generatingId === segment.id
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : segment.audio_url
                                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                : 'bg-violet-600 text-white hover:bg-violet-700'
                                            } disabled:opacity-50`}
                                    >
                                        {generatingId === segment.id ? '⏳ 생성 중...' : segment.audio_url ? '🔄 재생성' : '🎙️ 음성 생성'}
                                    </button>
                                </div>
                                <textarea
                                    id={`ta-${segment.id}`}
                                    value={segment.script_text}
                                    onChange={(e) => handleScriptChange(segment.id, e.target.value)}
                                    className="w-full p-3 bg-gray-50 rounded-lg text-gray-700 resize-none focus:ring-1 focus:ring-violet-300"
                                    rows={3}
                                />
                                {segment.audio_url && (
                                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <span className="text-green-600 text-sm font-medium">✅</span>
                                        <audio src={segment.audio_url} controls className="flex-1 h-10" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/script`} className="px-6 py-2 text-gray-600 hover:text-gray-800">← 이전 단계</Link>
                <button onClick={() => router.push(`/project/${projectId}/image`)} className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">다음 단계 →</button>
            </div>
        </div>
    );
}
