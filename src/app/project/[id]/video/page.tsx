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
    const [selectedProvider] = useState<'comfyui'>('comfyui');
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('rapid-aio-mega-sage');
    const [videoPrompt, setVideoPrompt] = useState('');

    // ...
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

    // Update video prompt when selected segment changes
    useEffect(() => {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg) {
            setVideoPrompt(seg.video_prompt || '');
        }
    }, [selectedSegmentId, segments]);

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
                const firstSeg = (data as Segment[])[0];
                setSelectedSegmentId(firstSeg.id);
                setVideoPrompt(firstSeg.video_prompt || '');
            }

            // Fetch project provider default
            const { data: project } = await supabase
                .from('projects')
                .select('video_provider')
                .eq('id', projectId)
                .single();

            if (project) {
                // provider is now fixed to comfyui
            }
        }
        setIsLoading(false);
    };

    const startPolling = (segmentId: string, requestId: string): Promise<boolean> => {
        return new Promise((resolve) => {
            if (pollingIntervals.current[segmentId]) {
                resolve(false);
                return;
            }
            addLog('info', `폴링 시작: ${requestId.slice(0, 8)}...`);
            addLog('warn', `⏳ 영상 생성 대기 중 (약 1-2분 소요)...`);

            let retryCount = 0;
            const maxRetries = 60; // 10초 간격 x 60회 = 최대 10분

            // 첫 폴링 전 10초 대기
            const initialDelay = setTimeout(() => {
                addLog('info', `첫 상태 확인 시작...`);

                const interval = setInterval(async () => {
                    try {
                        addLog('info', `상태 확인 중...`);
                        const res = await fetch(`/api/video/generate?requestId=${requestId}&segmentId=${segmentId}&provider=${selectedProvider}`);

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
                                resolve(false);
                            }
                            return; // 재시도
                        }

                        retryCount = 0; // 성공하면 리셋
                        const data = await res.json();
                        addLog('info', `응답: status=${data.status}, rawStatus=${data.debug?.rawStatus}, videoUrl=${data.videoUrl ? '있음' : '없음'}`);

                        if (data.status === 'completed' || data.status === 'failed' || data.status === 'succeeded') {
                            clearInterval(interval);
                            delete pollingIntervals.current[segmentId];
                            setGeneratingIds(prev => {
                                const next = new Set(prev);
                                next.delete(segmentId);
                                return next;
                            });

                            if (data.status === 'completed' || data.status === 'succeeded') {
                                addLog('success', `✅ 영상 생성 완료!`);
                                setSegments(prev => prev.map(s =>
                                    s.id === segmentId ? {
                                        ...s,
                                        video_url: data.videoUrl,
                                        video_prompt: data.generatedPrompt
                                    } : s
                                ));
                                if (selectedSegmentId === segmentId) {
                                    setVideoPrompt(data.generatedPrompt || '');
                                }
                                resolve(true);
                            } else {
                                addLog('error', `❌ 영상 생성 실패`);
                                resolve(false);
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
                            resolve(false);
                        }
                    }
                }, 10000); // 10초 간격으로 폴링

                pollingIntervals.current[segmentId] = interval;
            }, 10000); // 첫 폴링 전 10초 대기

            // 초기 타임아웃도 저장 (cleanup용)
            pollingIntervals.current[segmentId] = initialDelay as unknown as NodeJS.Timeout;
        });
    };

    const handleGenerateVideo = async (segment: Segment, waitForCompletion = false): Promise<boolean> => {
        if (!segment.image_url) {
            alert('이미지를 먼저 생성해 주세요.');
            return false;
        }

        const logLabel = selectedProvider === 'comfyui' ? selectedWorkflow : selectedModel;
        setGeneratingIds(prev => new Set(prev).add(segment.id));
        addLog('info', `🎬 영상 생성 시작 (${logLabel})`);
        try {
            addLog('info', `이미지 분석 및 프롬프트 생성 중...`);
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: segment.image_url,
                    model: selectedModel,
                    scriptText: segment.script_text,
                    visualDescription: segment.visual_description,
                    provider: selectedProvider,
                    motion: videoPrompt || 'auto',
                    workflowId: selectedProvider === 'comfyui' ? selectedWorkflow : undefined
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || errorText);
                } catch (e) {
                    throw new Error(`Failed to start generation: ${response.status} ${errorText}`);
                }
            }
            const data = await response.json();
            addLog('info', `프롬프트: ${data.generatedPrompt?.slice(0, 50)}...`);
            addLog('info', `requestId: ${data.externalJobId?.slice(0, 8)}...`);
            addLog('info', `초기 상태: ${data.status}`);

            if (data.status === 'running' || data.status === 'in_progress') {
                addLog('warn', `⏳ 비동기 생성 시작, 폴링 대기...`);
                if (waitForCompletion) {
                    // 순차 실행 모드: 완료될 때까지 기다림
                    return await startPolling(segment.id, data.externalJobId);
                } else {
                    // 개별 실행 모드: 폴링 시작하고 바로 리턴
                    startPolling(segment.id, data.externalJobId);
                    return true;
                }
            } else if ((data.status === 'completed' || data.status === 'succeeded') && data.videoUrl) {
                addLog('success', `✅ 즉시 완료!`);
                setSegments(prev => prev.map(s =>
                    s.id === segment.id ? {
                        ...s,
                        video_url: data.videoUrl,
                        video_prompt: data.generatedPrompt
                    } : s
                ));
                if (selectedSegmentId === segment.id) {
                    setVideoPrompt(data.generatedPrompt || '');
                }
                setGeneratingIds(prev => {
                    const next = new Set(prev);
                    next.delete(segment.id);
                    return next;
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Video Generation Error:', error);
            addLog('error', `❌ 에러: ${error}`);
            alert('영상 생성 시작에 실패했습니다.');
            setGeneratingIds(prev => {
                const next = new Set(prev);
                next.delete(segment.id);
                return next;
            });
            return false;
        }
    };

    const handleGenerateAll = async () => {
        addLog('info', `🚀 전체 생성 시작 (순차 실행 모드)`);
        const pendingSegments = segments.filter(seg => !seg.video_url && seg.image_url);
        addLog('info', `생성할 세그먼트: ${pendingSegments.length}개`);

        for (let i = 0; i < pendingSegments.length; i++) {
            const segment = pendingSegments[i];
            addLog('info', `--- [${i + 1}/${pendingSegments.length}] 세그먼트 생성 시작 ---`);
            const success = await handleGenerateVideo(segment, true); // waitForCompletion = true
            if (success) {
                addLog('success', `[${i + 1}/${pendingSegments.length}] 완료!`);
            } else {
                addLog('error', `[${i + 1}/${pendingSegments.length}] 실패, 다음으로 진행`);
            }
        }
        addLog('success', `🎉 전체 생성 완료!`);
    };

    const handleDeleteVideo = async (segmentId: string) => {
        if (!confirm('정말로 이 영상을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('segments')
                .update({ video_url: null })
                .eq('id', segmentId);

            if (error) throw error;

            setSegments(prev => prev.map(s =>
                s.id === segmentId ? { ...s, video_url: null } : s
            ));
            addLog('info', `🗑️ 영상 삭제 완료`);
        } catch (error) {
            console.error('Delete video error:', error);
            alert('영상 삭제에 실패했습니다.');
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
            <div className="flex items-center gap-6 p-4 bg-gray-50 border rounded-xl flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">생성기:</span>
                    <span className="px-3 py-1.5 border rounded-lg text-sm bg-white">💻 ComfyUI (로컬)</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">워크플로우:</span>
                    <select
                        value={selectedWorkflow}
                        onChange={(e) => setSelectedWorkflow(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm bg-white max-w-[300px]"
                    >
                        <option value="lf-i2v-v1.1">LF i2v (Batch) v1.1</option>
                        <option value="rapid-aio-mega">Rapid AIO Mega</option>
                        <option value="rapid-aio-mega-sage">Rapid AIO Mega + Sage</option>
                        <option value="rapid-aio-mega-sage-2">Rapid AIO Mega + Sage v2</option>
                        <option value="ltx-video-default">LTX Video (Fast)</option>
                    </select>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 bg-white px-4 py-1.5 border rounded-lg">
                    <span>형식: <span className="text-gray-900 font-medium">MP4</span></span>
                    <span className="w-px h-3 bg-gray-200"></span>
                    <span>러닝타임: <span className="text-gray-900 font-medium">컷당 6초</span></span>
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
                                    <>
                                        <video
                                            src={selectedSegment.video_url}
                                            className="w-full h-full object-contain"
                                            controls
                                            autoPlay
                                            loop
                                        />
                                        <button
                                            onClick={() => handleDeleteVideo(selectedSegment.id)}
                                            className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors"
                                            title="영상 삭제"
                                        >
                                            🗑️
                                        </button>
                                    </>
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
                            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 block">
                                        비디오 모션 프롬프트
                                        <span className="text-xs font-normal text-gray-500 ml-2">(비어두면 AI가 자동으로 생성합니다)</span>
                                    </label>
                                    <textarea
                                        value={videoPrompt}
                                        onChange={(e) => setVideoPrompt(e.target.value)}
                                        placeholder="예: 천천히 줌인하면서 주인공의 표정을 클로즈업..."
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="p-3 bg-violet-50 rounded-lg text-sm text-gray-600">
                                    💡 <span className="font-semibold text-violet-700">대본:</span> {selectedSegment.script_text}
                                </div>
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
