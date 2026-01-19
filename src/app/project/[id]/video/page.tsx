'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

export default function VideoPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
    const [selectedModel, setSelectedModel] = useState<'hailuo' | 'kling'>('hailuo');
    const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string }>>([]);
    const [showLogs, setShowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

    const addLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-50), { time, type, message }]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (projectId) {
            fetchSegments();
        }
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
        };
    }, [projectId]);

    const fetchSegments = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('segments')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        if (!error && data) {
            setSegments(data as Segment[]);
            if (data.length > 0 && !selectedSegmentId) {
                setSelectedSegmentId((data as Segment[])[0].id);
            }
        }
        setIsLoading(false);
    };

    const startPolling = (segmentId: string, requestId: string) => {
        if (pollingIntervals.current[segmentId]) return;
        addLog('info', `폴링 시작: ${requestId.slice(0, 8)}...`);
        addLog('warn', `⏳ 영상 생성 대기 중 (약 1-2분 소요)...`);

        let retryCount = 0;
        const maxRetries = 30; // 10초 간격 x 30회 = 최대 5분

        // 첫 폴링 전 10초 대기
        const initialDelay = setTimeout(() => {
            addLog('info', `첫 상태 확인 시작...`);

            const interval = setInterval(async () => {
                try {
                    addLog('info', `상태 확인 중...`);
                    const res = await fetch(`/api/video/generate?requestId=${requestId}&segmentId=${segmentId}`);

                    if (!res.ok) {
                        retryCount++;
                        const errorText = await res.text();
                        addLog('warn', `상태 확인 실패 (${res.status}), 재시도 ${retryCount}/${maxRetries}`);

                        if (retryCount >= maxRetries) {
                            addLog('error', `최대 재시도 횟수 초과: ${errorText.slice(0, 100)}`);
                            clearInterval(interval);
                            delete pollingIntervals.current[segmentId];
                            setGeneratingIds(prev => {
                                const next = new Set(prev);
                                next.delete(segmentId);
                                return next;
                            });
                        }
                        return; // 재시도
                    }

                    retryCount = 0; // 성공하면 리셋
                    const data = await res.json();
                    addLog('info', `응답: status=${data.status}, rawStatus=${data.debug?.rawStatus}, videoUrl=${data.videoUrl ? '있음' : '없음'}`);

                    if (data.status === 'completed' || data.status === 'failed') {
                        clearInterval(interval);
                        delete pollingIntervals.current[segmentId];
                        setGeneratingIds(prev => {
                            const next = new Set(prev);
                            next.delete(segmentId);
                            return next;
                        });

                        if (data.status === 'completed') {
                            addLog('success', `✅ 영상 생성 완료!`);
                            setSegments(prev => prev.map(s =>
                                s.id === segmentId ? { ...s, video_url: data.videoUrl } : s
                            ));
                        } else {
                            addLog('error', `❌ 영상 생성 실패`);
                        }
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                    retryCount++;
                    addLog('warn', `폴링 에러, 재시도 ${retryCount}/${maxRetries}: ${error}`);

                    if (retryCount >= maxRetries) {
                        clearInterval(interval);
                        delete pollingIntervals.current[segmentId];
                        setGeneratingIds(prev => {
                            const next = new Set(prev);
                            next.delete(segmentId);
                            return next;
                        });
                    }
                }
            }, 10000); // 10초 간격으로 폴링

            pollingIntervals.current[segmentId] = interval;
        }, 10000); // 첫 폴링 전 10초 대기

        // 초기 타임아웃도 저장 (cleanup용)
        pollingIntervals.current[segmentId] = initialDelay as unknown as NodeJS.Timeout;
    };

    const handleGenerateVideo = async (segment: Segment) => {
        if (!segment.image_url) {
            alert('이미지를 먼저 생성해 주세요.');
            return;
        }

        setGeneratingIds(prev => new Set(prev).add(segment.id));
        addLog('info', `🎬 영상 생성 시작 (${selectedModel})`);
        try {
            addLog('info', `이미지 분석 및 프롬프트 생성 중...`);
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: segment.image_url,
                    segmentId: segment.id,
                    model: selectedModel,
                    scriptText: segment.script_text,
                    visualDescription: segment.visual_description,
                }),
            });

            if (!response.ok) throw new Error('Failed to start video generation');
            const data = await response.json();
            addLog('info', `프롬프트: ${data.generatedPrompt?.slice(0, 50)}...`);
            addLog('info', `requestId: ${data.requestId?.slice(0, 8)}...`);
            addLog('info', `초기 상태: ${data.status}`);

            if (data.status === 'in_progress') {
                addLog('warn', `⏳ 비동기 생성 시작, 폴링 대기...`);
                startPolling(segment.id, data.requestId);
            } else if (data.status === 'completed' && data.videoUrl) {
                addLog('success', `✅ 즉시 완료!`);
                setSegments(prev => prev.map(s =>
                    s.id === segment.id ? { ...s, video_url: data.videoUrl } : s
                ));
                setGeneratingIds(prev => {
                    const next = new Set(prev);
                    next.delete(segment.id);
                    return next;
                });
            }
        } catch (error) {
            console.error('Video Generation Error:', error);
            addLog('error', `❌ 에러: ${error}`);
            alert('영상 생성 시작에 실패했습니다.');
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(segment.id);
                return next;
            });
        }
    };

    const handleGenerateAll = async () => {
        for (const segment of segments) {
            if (!segment.video_url && !generatingIds.has(segment.id)) {
                await handleGenerateVideo(segment);
            }
        }
    };

    const selectedSegment = segments.find(s => s.id === selectedSegmentId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">영상 생성</h2>
                    <p className="text-gray-500 mt-1">이미지에 AI 기술로 생동감 넘치는 모션을 부여합니다.</p>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={generatingIds.size > 0}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                    {generatingIds.size > 0 ? '영상 생성 중...' : '▶ 전체 생성 시작'}
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 border rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">비디오 모델:</span>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value as 'hailuo' | 'kling')}
                        className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                        <option value="hailuo">🎬 Hailuo 2.3 (빠름/고품질)</option>
                        <option value="kling">🎬 Kling 2.6 (정교함)</option>
                    </select>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 bg-white px-4 py-1.5 border rounded-lg">
                    <span>형식: <span className="text-gray-900 font-medium">MP4</span></span>
                    <span className="w-px h-3 bg-gray-200"></span>
                    <span>러닝타임: <span className="text-gray-900 font-medium">컷당 5~10초</span></span>
                    <span className="w-px h-3 bg-gray-200"></span>
                    <span>FPS: <span className="text-gray-900 font-medium">24</span></span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Segment List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400">불러오는 중...</div>
                    ) : segments.map((seg, index) => (
                        <button
                            key={seg.id}
                            onClick={() => setSelectedSegmentId(seg.id)}
                            className={`w-full p-3 rounded-xl border-2 text-left transition-all
                                ${selectedSegmentId === seg.id
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                                    {seg.image_url && (
                                        <img src={seg.image_url} alt="" className="w-full h-full object-cover opacity-50" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {generatingIds.has(seg.id) ? (
                                            <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : seg.video_url ? (
                                            <span className="text-xl">✅</span>
                                        ) : (
                                            <span className="text-xl">🎬</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-violet-600 mb-1">CUT #{index + 1}</p>
                                    <p className="text-sm text-gray-600 truncate">{seg.script_text}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Preview Area */}
                <div className="col-span-2">
                    {selectedSegment ? (
                        <div className="space-y-4">
                            <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-2xl">
                                {selectedSegment.video_url ? (
                                    <video
                                        src={selectedSegment.video_url}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                        loop
                                    />
                                ) : generatingIds.has(selectedSegment.id) ? (
                                    <div className="flex flex-col items-center gap-4 text-white">
                                        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="font-medium animate-pulse">영상을 생성하고 있습니다...</p>
                                        <p className="text-xs text-gray-400">잠시만 기다려 주세요 (약 1~2분 소요)</p>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 space-y-3">
                                        <span className="text-5xl">🎞️</span>
                                        <p>영상을 생성하세요</p>
                                        <button
                                            onClick={() => handleGenerateVideo(selectedSegment)}
                                            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                                        >
                                            현재 컷 생성하기
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-4 border rounded-xl text-sm text-gray-600">
                                💡 <span className="font-semibold">대본:</span> {selectedSegment.script_text}
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                            왼쪽에서 컷을 선택해 주세요.
                        </div>
                    )}
                </div>
            </div>

            {/* Debug Log Panel */}
            {showLogs && (
                <div className="fixed right-4 top-20 w-96 max-h-[70vh] bg-gray-900 text-gray-100 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-sm font-bold">📋 실시간 로그</span>
                        <div className="flex gap-2">
                            <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-white">지우기</button>
                            <button onClick={() => setShowLogs(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                    </div>
                    <div className="p-3 overflow-y-auto max-h-[60vh] font-mono text-xs space-y-1">
                        {logs.length === 0 ? (
                            <p className="text-gray-500">로그가 없습니다.</p>
                        ) : logs.map((log, i) => (
                            <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'warn' ? 'text-yellow-400' :
                                        'text-gray-300'
                                }`}>
                                <span className="text-gray-500 flex-shrink-0">{log.time}</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}

            {!showLogs && (
                <button
                    onClick={() => setShowLogs(true)}
                    className="fixed right-4 top-20 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm hover:bg-gray-800 z-50"
                >
                    📋 로그 보기
                </button>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/image`} className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 이전 단계
                </Link>
                <button
                    onClick={() => router.push(`/project/${projectId}/preview`)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
