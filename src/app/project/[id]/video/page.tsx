'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';
import { useVideoPolling } from '@/context/VideoPollingContext';

export default function VideoPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { generatingIds, logs, startPolling, addLog, resumePendingJobs, addGeneratingId, removeGeneratingId, lastCompletedJob } = useVideoPolling();
    const [selectedModel, setSelectedModel] = useState<'hailuo' | 'kling'>('hailuo');
    const [selectedProvider] = useState<'comfyui'>('comfyui');
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('rapid-aio-mega-sage');

    // Persistence logic for workflow
    useEffect(() => {
        const savedWorkflow = localStorage.getItem('autovideo_selected_workflow');
        if (savedWorkflow) {
            setSelectedWorkflow(savedWorkflow);
        }
    }, []);

    useEffect(() => {
        if (selectedWorkflow) {
            localStorage.setItem('autovideo_selected_workflow', selectedWorkflow);
        }
    }, [selectedWorkflow]);
    const [videoPrompt, setVideoPrompt] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 10;

    // Auto-Advance Generation State
    const [isGlobalGenerating, setIsGlobalGenerating] = useState(false);
    const isGlobalGeneratingRef = useRef(false);

    // Sync ref with state
    useEffect(() => {
        isGlobalGeneratingRef.current = isGlobalGenerating;
    }, [isGlobalGenerating]);

    // Sync Ref with State (Must be before Auto-Advance effect)
    useEffect(() => {
        isGlobalGeneratingRef.current = isGlobalGenerating;
    }, [isGlobalGenerating]);

    // ...
    // ...
    // Logs state moved to Context
    const [showLogs, setShowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Polling intervals managed by Context

    // Scroll to bottom when logs update
    useEffect(() => {
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [logs]);

    // Resume jobs on mount (via Context)
    useEffect(() => {
        if (projectId) {
            fetchSegments();
            resumePendingJobs(projectId);
        }
    }, [projectId, resumePendingJobs]);

    // Phase 2: Auto-Resume logic handled by Context

    // Listen for background completions from Context
    useEffect(() => {
        if (lastCompletedJob) {
            console.log('[VideoPage] Received completion signal:', lastCompletedJob);
            setSegments(prev => prev.map(s =>
                s.id === lastCompletedJob.segmentId ? {
                    ...s,
                    video_url: lastCompletedJob.videoUrl
                } : s
            ));
        }
    }, [lastCompletedJob]);

    // Update video prompt when selected segment changes
    useEffect(() => {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg) {
            setVideoPrompt(seg.video_prompt || '');
        }
    }, [selectedSegmentId, segments]);

    // Autopilot Logic
    useEffect(() => {
        const autopilot = new URLSearchParams(window.location.search).get('autopilot') === 'true';
        if (!autopilot || isLoading || segments.length === 0) return;

        // Auto-start generation
        if (!isGlobalGenerating && !segments.every(s => s.video_url)) {
            console.log('[Autopilot] Starting global video generation...');
            setIsGlobalGenerating(true);
            setVideoPrompt('autogenerate'); // dummy change to trigger effect if needed
        }

        // Check completion
        const allDone = segments.every(s => s.video_url);
        if (allDone) {
            const targetStep = new URLSearchParams(window.location.search).get('targetStep');
            console.log('[Autopilot] Video generation complete. Moving to Preview step...');
            router.push(`/project/${projectId}/preview?autopilot=true&targetStep=${targetStep}`);
        }
    }, [isLoading, segments, isGlobalGenerating]);

    // Auto-Advance Logic: When loading finishes, if global generation is active, process the new page
    useEffect(() => {
        if (!isLoading && isGlobalGenerating && segments.length > 0) {
            console.log('[AutoAdvance] Page loaded, resuming generation...');
            processCurrentPage();
        }
    }, [isLoading, isGlobalGenerating, segments.length]);

    const fetchSegments = async () => {
        setIsLoading(true);
        try {
            console.log('[VideoPage] Fetching segment metadata for project:', projectId);

            // 1. Fetch only lightweight metadata first (No image_url, video_url)
            const { data, error, status, statusText } = await supabase
                .from('segments')
                .select('id, order_index, script_text, video_prompt') // Exclude image_url, video_url
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (error) {
                console.error('[VideoPage] Error fetching segments:', { message: error.message, code: error.code });
                addLog('error', `세그먼트 목록 로딩 실패: ${error.message}`);
            } else if (data) {
                console.log(`[VideoPage] Loaded ${data.length} segments metadata`);
                setSegments(data as Segment[]); // Initialize with partial data
                setTotalCount(data.length); // Fixed: Set total count for pagination logic

                if (data.length > 0 && !selectedSegmentId) {
                    const firstSeg = (data as Segment[])[0];
                    setSelectedSegmentId(firstSeg.id);
                    setVideoPrompt(firstSeg.video_prompt || '');
                }

                // 2. Start background loading of heavy media data
                loadMediaForSegments(data as Segment[]);
            }
        } catch (err: any) {
            console.error('[VideoPage] Unexpected error:', err);
            addLog('error', `예상치 못한 오류: ${err.message}`);
        }
        setIsLoading(false);
    };

    // Lazy load media for segments one by one to avoid timeout
    const loadMediaForSegments = async (initialSegments: Segment[]) => {
        console.log('[VideoPage] Starting background media loading...');

        // Process in small batches or one by one
        for (const seg of initialSegments) {
            try {
                const { data, error } = await supabase
                    .from('segments')
                    .select('id, image_url, video_url')
                    .eq('id', seg.id)
                    .single();

                if (data && !error) {
                    const typedData = data as any;
                    setSegments(prev => prev.map(s =>
                        s.id === typedData.id ? { ...s, image_url: typedData.image_url, video_url: typedData.video_url } : s
                    ));
                }
            } catch (e) {
                console.warn(`[VideoPage] Failed to load media for segment ${seg.id}`, e);
            }
            // Small delay to be gentle on the DB
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const videoCount = segments.filter(s => s.video_url).length; // Note: using s.video_url from loop scope might be tricky if state not updated yet. 
        // Better to check filtered list if possible, but state update is async.
        // Actually, let's just use the simple log for now if this is hard to match.
        // Wait, I can calculate based on what I just loaded? No, too complex.
        // Let's just blindly replace the log line.
        console.log('[VideoPage] Background media loading complete');
        addLog('info', '미디어 로드 완료 (백그라운드)');
    };

    // Polling logic moved to Context

    const handleGenerateVideo = async (segment: Segment, waitForCompletion = false): Promise<boolean> => {
        if (!segment.image_url) {
            alert('이미지를 먼저 생성해 주세요.');
            return false;
        }

        const logLabel = selectedProvider === 'comfyui' ? selectedWorkflow : selectedModel;

        // Optimistically show spinner via Context
        addGeneratingId(segment.id);

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
                    segmentId: segment.id, // Fixed: Added segmentId for persistence
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
                // Always start polling regardless of waitForCompletion
                // waitForCompletion only affects whether this function waits for the *result*
                const pollingPromise = startPolling(segment.id, data.externalJobId, selectedProvider);

                if (waitForCompletion) {
                    return await pollingPromise;
                }
                return true;
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
                removeGeneratingId(segment.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Video Generation Error:', error);
            addLog('error', `❌ 에러: ${error}`);
            // alert('영상 생성 시작에 실패했습니다.'); // Remove alert to not block UI in batch
            removeGeneratingId(segment.id);
            return false;
        }
    };

    const processCurrentPage = async () => {
        console.log('[AutoAdvance] Processing current page...');
        const pendingSegments = segments.filter(seg => !seg.video_url && seg.image_url && !generatingIds.has(seg.id));
        const skippedCount = segments.length - pendingSegments.length;

        if (pendingSegments.length === 0) {
            console.log('[AutoAdvance] No pending items on this page.');
            addLog('info', `✅ 대기 중인 작업이 없습니다. (완료: ${skippedCount}개)`);
            setIsGlobalGenerating(false);
            return;
        }

        addLog('info', `🚀 전체 생성 시작: 총 ${segments.length}개 중 ${pendingSegments.length}개 요청 (완료/진행중: ${skippedCount}개)`);

        const MAX_CONCURRENT_REQUESTS = 3; // Prevent DB connection pool exhaustion
        const activePromises = new Set<Promise<any>>();

        for (let i = 0; i < pendingSegments.length; i++) {
            // Check cancellation
            if (!isGlobalGeneratingRef.current) {
                addLog('warn', '🛑 전체 생성 중단됨');
                return;
            }

            // Concurrency Control: Wait if we reached limit
            if (activePromises.size >= MAX_CONCURRENT_REQUESTS) {
                await Promise.race(activePromises);
            }

            const seg = pendingSegments[i];

            // Log progress
            if (i % 5 === 0) {
                console.log(`[AutoAdvance] Queueing ${i + 1}/${pendingSegments.length}`);
            }

            // Create submission promise
            const p = handleGenerateVideo(seg, false).then(() => {
                // When submission is done (not generation, just API call)
                activePromises.delete(p);
            });

            activePromises.add(p);

            // Minimal delay to be gentle to CPU/EventLoop
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Wait for remaining submissions to finish
        // Note: We don't need to wait for VIDEO generation, just the API Handshake.
        await Promise.all(activePromises);

        addLog('success', `🎉 모든 큐 요청 완료! (백그라운드에서 계속 생성됩니다)`);
        setIsGlobalGenerating(false);
    };

    const checkNextPage = () => {
        // Legacy pagination check - no longer used for auto-advance
        if (!isGlobalGeneratingRef.current) return;
        // Keep for manual button references if any
    };

    const handleGenerateAll = () => {
        if (isGlobalGenerating) {
            handleCancelAll();
        } else {
            setIsGlobalGenerating(true);
            addLog('info', '🚀 전체 생성 시작 (자동 페이지 넘김)');
            // Trigger handled by useEffect (processCurrentPage called there)
        }
    };

    const handleCancelAll = async () => {
        if (!confirm('현재 진행 중인 모든 영상 생성을 중단할까요? (GPU 자원이 해제됩니다)')) return;

        setIsGlobalGenerating(false);
        addLog('warn', '🛑 생성 중단 요청 중...');

        try {
            const res = await fetch('/api/video/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });

            if (res.ok) {
                const data = await res.json();
                addLog('success', `🛑 ${data.cancelledCount || 0}개의 작업이 중단되었습니다.`);
            } else {
                addLog('error', '중단 요청 실패');
            }
        } catch (error) {
            addLog('error', '중단 요청 중 오류 발생');
        }
    };

    const handleDeleteVideo = async (segmentId: string) => {
        if (!confirm('정말로 이 영상을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('segments')
                .update({ video_url: null } as never)
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
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            addLog('info', '🔄 수동 상태 동기화 요청');
                            resumePendingJobs(projectId);
                            fetchSegments(); // Also re-fetch data to catch up
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                        🔄 상태 갱신
                    </button>
                    <button
                        onClick={() => {
                            if (isGlobalGenerating || generatingIds.size > 0) {
                                handleCancelAll();
                            } else {
                                handleGenerateAll();
                            }
                        }}
                        className={`px-6 py-2 text-white rounded-lg transition-colors ${isGlobalGenerating || generatingIds.size > 0
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-violet-600 hover:bg-violet-700'
                            }`}
                    >
                        {isGlobalGenerating
                            ? '🛑 큐잉 중단'
                            : generatingIds.size > 0
                                ? `🚨 전체 취소 (${generatingIds.size})`
                                : '▶ 전체 생성 시작'
                        }
                    </button>
                </div>
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

                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-2 mt-2 border-t pt-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0 || isLoading}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                        ◀ 이전
                    </button>
                    <span className="text-sm text-gray-600">
                        {currentPage + 1} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) - 1 || isLoading}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                        다음 ▶
                    </button>
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

            {/* Status & Log Panel */}
            <div className="fixed right-4 top-24 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 flex flex-col max-h-[80vh]">
                {/* Header & Progress */}
                <div className="p-4 bg-gray-50 border-b flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span>📊 작업 현황</span>
                            {generatingIds.size > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-800 animate-pulse">
                                    {generatingIds.size}개 처리 중
                                </span>
                            )}
                        </h3>
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="text-xs text-gray-500 hover:text-gray-800 underline"
                        >
                            {showLogs ? '로그 접기' : '로그 펼치기'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600 font-medium">
                            <span>진행률</span>
                            <span>{Math.round((segments.filter(s => s.video_url).length / Math.max(1, segments.length)) * 100)}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-violet-600 transition-all duration-500 ease-out"
                                style={{ width: `${(segments.filter(s => s.video_url).length / Math.max(1, segments.length)) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>완료: {segments.filter(s => s.video_url).length}</span>
                            <span>전체: {segments.length}</span>
                        </div>
                    </div>
                </div>

                {/* Live Logs */}
                {showLogs && (
                    <div className="flex-1 bg-gray-900 text-gray-100 overflow-hidden flex flex-col min-h-[200px]">
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 text-xs">
                            <span className="font-bold text-gray-400">📋 시스템 로그</span>
                            <button onClick={() => { /* clear logs if needed */ }} className="text-gray-500 hover:text-gray-300">지우기</button>
                        </div>
                        <div className="p-3 overflow-y-auto font-mono text-xs space-y-1.5 flex-1">
                            {logs.length === 0 ? (
                                <p className="text-gray-600 italic text-center py-4">대기 중...</p>
                            ) : logs.map((log) => (
                                <div key={log.id} className={`flex gap-2 break-all ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-green-400' :
                                            log.type === 'warn' ? 'text-yellow-400' :
                                                'text-gray-300'
                                    }`}>
                                    <span className="text-gray-600 flex-shrink-0 select-none">
                                        {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}
            </div>

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
