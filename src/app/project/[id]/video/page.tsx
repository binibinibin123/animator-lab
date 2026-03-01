'use client';
// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';
import { useVideoPolling } from '@/context/VideoPollingContext';

interface VideoModelOption {
    id: string;
    label: string;
    description: string;
    previewSource?: 'fal' | 'local' | 'none';
    previewImageUrl?: string;
    previewVideoUrl?: string;
    fallbackPreviewImageUrl?: string;
    resolutions: Array<{
        id: string;
        creditsPerCut: number;
    }>;
}

interface HoverPreviewPosition {
    left: number;
    top: number;
}

const DEFAULT_VIDEO_MODEL_ID = 'ltx-2-fast';
const MODEL_HOVER_PREVIEW_WIDTH = 432;
const MODEL_HOVER_PREVIEW_HEIGHT = 243;

export default function VideoPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { generatingIds, logs, startPolling, addLog, resumePendingJobs, addGeneratingId, removeGeneratingId, lastCompletedJob } = useVideoPolling();
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_VIDEO_MODEL_ID);
    const [selectedResolution, setSelectedResolution] = useState<string>('1080p');
    const [videoModels, setVideoModels] = useState<VideoModelOption[]>([]);
    const [failedModelPreviewVideoIds, setFailedModelPreviewVideoIds] = useState<Record<string, true>>({});
    const [readyModelPreviewVideoIds, setReadyModelPreviewVideoIds] = useState<Record<string, true>>({});
    const [modelHoverPreview, setModelHoverPreview] = useState<HoverPreviewPosition | null>(null);
    const selectedProvider = 'fal';
    const [videoPrompt, setVideoPrompt] = useState('');
    const hoverPreviewHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedVideoModel = videoModels.find((model) => model.id === selectedModel) || videoModels[0] || null;
    const selectedResolutionOption = selectedVideoModel?.resolutions.find((resolution) => resolution.id === selectedResolution)
        || selectedVideoModel?.resolutions[0]
        || null;

    const clearHoverPreviewHideTimer = () => {
        if (hoverPreviewHideTimerRef.current) {
            clearTimeout(hoverPreviewHideTimerRef.current);
            hoverPreviewHideTimerRef.current = null;
        }
    };

    const openModelHoverPreview = (previewEl: HTMLElement) => {
        clearHoverPreviewHideTimer();

        const rect = previewEl.getBoundingClientRect();
        let left = rect.right + 16;
        if (left + MODEL_HOVER_PREVIEW_WIDTH > window.innerWidth - 16) {
            left = rect.left - MODEL_HOVER_PREVIEW_WIDTH - 16;
        }
        if (left < 16) {
            left = Math.max(16, Math.round((window.innerWidth - MODEL_HOVER_PREVIEW_WIDTH) / 2));
        }

        const centeredTop = rect.top + (rect.height / 2) - (MODEL_HOVER_PREVIEW_HEIGHT / 2);
        const top = Math.max(16, Math.min(centeredTop, window.innerHeight - MODEL_HOVER_PREVIEW_HEIGHT - 16));

        setModelHoverPreview({ left, top });
    };

    const scheduleCloseModelHoverPreview = () => {
        clearHoverPreviewHideTimer();
        hoverPreviewHideTimerRef.current = setTimeout(() => {
            setModelHoverPreview(null);
        }, 120);
    };

    const markModelPreviewVideoFailed = (modelId: string) => {
        setFailedModelPreviewVideoIds((prev) => {
            if (prev[modelId]) {
                return prev;
            }

            return {
                ...prev,
                [modelId]: true,
            };
        });
    };

    const markModelPreviewVideoReady = (modelId: string) => {
        setReadyModelPreviewVideoIds((prev) => {
            if (prev[modelId]) {
                return prev;
            }

            return {
                ...prev,
                [modelId]: true,
            };
        });
    };

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

    const segmentsRef = useRef(segments);
    useEffect(() => {
        segmentsRef.current = segments;
    }, [segments]);

    const generatingIdsRef = useRef(generatingIds);
    useEffect(() => {
        generatingIdsRef.current = generatingIds;
    }, [generatingIds]);

    // ...
    // ...
    // Logs state moved to Context
    const [showLogs, setShowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Polling intervals managed by Context

    useEffect(() => {
        let cancelled = false;

        const loadVideoModels = async () => {
            try {
                const response = await fetch('/api/models/video');
                if (!response.ok) {
                    throw new Error('비디오 모델 정보를 불러오지 못했습니다.');
                }

                const payload = await response.json();
                if (cancelled) {
                    return;
                }

                const nextModels: VideoModelOption[] = payload?.models || [];
                setVideoModels(nextModels);

                if (nextModels.length > 0) {
                    setSelectedModel((prevModelId) => {
                        const currentModel = nextModels.find((model) => model.id === prevModelId) || nextModels[0];
                        setSelectedResolution((prevResolution) => {
                            const currentResolution = currentModel.resolutions.find((resolution) => resolution.id === prevResolution) || currentModel.resolutions[0];
                            return currentResolution ? currentResolution.id : prevResolution;
                        });
                        return currentModel.id;
                    });
                }
            } catch (error: any) {
                if (!cancelled) {
                    addLog('warn', error?.message || '비디오 모델 정보를 불러오지 못했습니다.');
                }
            }
        };

        void loadVideoModels();

        return () => {
            cancelled = true;
        };
    }, [addLog]);

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

    useEffect(() => {
        return () => {
            if (hoverPreviewHideTimerRef.current) {
                clearTimeout(hoverPreviewHideTimerRef.current);
                hoverPreviewHideTimerRef.current = null;
            }
        };
    }, []);

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

            const { data: projectData } = await supabase
                .from('projects')
                .select('video_model')
                .eq('id', projectId)
                .single();

            const project = projectData as { video_model?: string | null } | null;
            if (project?.video_model) {
                const isSupportedModel = videoModels.length === 0 || videoModels.some((model) => model.id === project.video_model);
                const resolvedModelId = isSupportedModel ? project.video_model : DEFAULT_VIDEO_MODEL_ID;
                setSelectedModel(resolvedModelId);
                const resolvedModel = videoModels.find((model) => model.id === resolvedModelId) || videoModels[0];
                if (resolvedModel?.resolutions[0]) {
                    setSelectedResolution(resolvedModel.resolutions[0].id);
                }
            }

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

    // Optimized batch loader
    const loadMediaForSegments = async (initialSegments: Segment[]) => {
        if (initialSegments.length === 0) return;

        console.log('[VideoPage] Starting background media loading (batch)...');

        try {
            const ids = initialSegments.map(s => s.id);
            const { data, error } = await supabase
                .from('segments')
                .select('id, image_url, video_url')
                .in('id', ids);

            if (data && !error) {
                // Create a map for faster lookup
                const mediaMap = new Map(data.map((item: any) => [item.id, item]));

                setSegments(prev => prev.map(s => {
                    const media = mediaMap.get(s.id);
                    if (media) {
                        return { ...s, image_url: media.image_url, video_url: media.video_url };
                    }
                    return s;
                }));
            } else {
                console.error('[VideoPage] Batch media load error:', error);
            }
        } catch (e) {
            console.error('[VideoPage] Batch media load exception:', e);
        }

        console.log('[VideoPage] Media loading complete');
        addLog('info', '미디어 데이터 동기화 완료');
    };

    // Polling logic moved to Context

    const handleGenerateVideo = async (segment: Segment, waitForCompletion = false, manualPrompt?: string): Promise<boolean> => {
        if (!segment.image_url) {
            alert('이미지를 먼저 생성해 주세요.');
            return false;
        }

        const selectedModelMeta = videoModels.find((m) => m.id === selectedModel);
        const logLabel = selectedModelMeta?.label || selectedModel;
        const promptToUse = manualPrompt !== undefined ? manualPrompt : (segment.video_prompt || 'auto');

        if (!selectedResolutionOption) {
            addLog('error', '비디오 해상도 설정이 준비되지 않았습니다. 모델 로딩 후 다시 시도해 주세요.');
            return false;
        }

        // Optimistically show spinner via Context
        addGeneratingId(segment.id);

        addLog('info', `🎬 영상 생성 시작 (${logLabel})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
            addLog('info', `이미지 분석 및 프롬프트 생성 중...`);
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    imageUrl: segment.image_url,
                    modelId: selectedModel,
                    resolution: selectedResolution,
                    scriptText: segment.script_text,
                    visualDescription: segment.visual_description,
                    provider: selectedProvider,
                    motion: promptToUse,
                    segmentId: segment.id,
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
        } catch (error: any) {
            console.error('Video Generation Error:', error);
            if (error.name === 'AbortError') {
                addLog('error', `❌ 시간 초과 (60s): 서버 응답이 지연되어 취소됨`);
            } else {
                addLog('error', `❌ 에러: ${error}`);
            }
            removeGeneratingId(segment.id);
            return false;
        } finally {
            clearTimeout(timeoutId);
        }
    };

    const processCurrentPage = async () => {
        console.log('[AutoAdvance] Processing current page...');

        // Use Refs to get fresh state during async execution
        const currentSegments = segmentsRef.current;
        const currentGeneratingIds = generatingIdsRef.current;

        const pendingSegments = currentSegments.filter(seg => !seg.video_url && seg.image_url && !currentGeneratingIds.has(seg.id));
        const skippedCount = currentSegments.length - pendingSegments.length;

        if (pendingSegments.length === 0) {
            console.log('[AutoAdvance] No pending items on this page.');
            addLog('info', `✅ 대기 중인 작업이 없습니다. (완료: ${skippedCount}개)`);
            setIsGlobalGenerating(false);
            return;
        }

        addLog('info', `🚀 전체 생성 시작: 총 ${currentSegments.length}개 중 ${pendingSegments.length}개 요청 (완료/진행중: ${skippedCount}개)`);

        const MAX_CONCURRENT_REQUESTS = 3; // Prevent DB connection pool exhaustion
        const activePromises = new Set<Promise<any>>();

        for (let i = 0; i < pendingSegments.length; i++) {
            // Check cancellation
            if (!isGlobalGeneratingRef.current) {
                addLog('warn', '🛑 전체 생성 중단됨');
                return;
            }

            // Concurrency Control: Wait if we reached limit
            const MAX_ACTIVE_JOBS = 2;
            while (generatingIdsRef.current.size >= MAX_ACTIVE_JOBS) {
                if (!isGlobalGeneratingRef.current) {
                    addLog('warn', '🛑 전체 생성 중단됨');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Request Concurrency Control (Secondary)
            if (activePromises.size >= MAX_CONCURRENT_REQUESTS) {
                await Promise.race(activePromises);
            }

            const seg = pendingSegments[i];

            // Double check if it's already generated or generating (race condition check)
            if (generatingIdsRef.current.has(seg.id) || segmentsRef.current.find(s => s.id === seg.id)?.video_url) {
                continue;
            }

            // Log progress
            if (i % 5 === 0) {
                console.log(`[AutoAdvance] Queueing ${i + 1}/${pendingSegments.length}`);
            }

            // Create submission promise
            const p = (async () => {
                const success = await handleGenerateVideo(seg, false);

                if (!success) {
                    addLog('error', `❌ [Final] 세그먼트 #${seg.order_index + 1} 생성 최종 실패.`);
                }
            })().then(() => {
                // When submission is done
                activePromises.delete(p);
            });

            activePromises.add(p);

            // Minimal delay to be gentle to CPU/EventLoop
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Wait for remaining submissions to finish
        // Note: We don't need to wait for VIDEO generation, just the API Handshake.
        await Promise.all(activePromises);

        addLog('success', `🎉 현재 배치 요청 완료!`);

        // ... (watchdog logic remains same)
        const freshSegments = segmentsRef.current;
        const freshGeneratingIds = generatingIdsRef.current;
        const remainingStragglers = freshSegments.filter(s => !s.video_url && !freshGeneratingIds.has(s.id));

        if (remainingStragglers.length > 0 && isGlobalGeneratingRef.current) {
            addLog('warn', `⚠️ 미완료된 ${remainingStragglers.length}개 항목 재시도 중... (Watchdog)`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
            processCurrentPage(); // Recursion
        } else if (freshSegments.every(s => s.video_url)) {
            addLog('success', `🎉 모든 영상 생성 완료!`);
            setIsGlobalGenerating(false);
        } else {
            if (!isGlobalGeneratingRef.current) {
                addLog('warn', '🛑 전체 생성 중단됨');
            } else {
                addLog('info', '⏳ 생성 중인 작업 대기 중...');
            }
        }
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
            // 1. Delete the job execution record first (to prevent auto-healing/restore)
            const { error: jobError } = await supabase
                .from('video_jobs')
                .delete()
                .eq('segment_id', segmentId);

            if (jobError) {
                console.error('Failed to delete video job:', jobError);
                // Continue anyway to delete the segment URL
            }

            // 2. Clear the video URL in segments table
            const { error } = await supabase
                .from('segments')
                .update({ video_url: null } as never)
                .eq('id', segmentId);

            if (error) throw error;

            setSegments(prev => prev.map(s =>
                s.id === segmentId ? { ...s, video_url: null } : s
            ));

            // Remove from local polling/generating state just in case
            removeGeneratingId(segmentId);

            addLog('info', `🗑️ 영상 삭제 완료`);
        } catch (error) {
            console.error('Delete video error:', error);
            alert('영상 삭제에 실패했습니다.');
        }
    };

    const handleDeleteAllVideos = async () => {
        if (!confirm('정말로 모든 영상을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        // Stop any running generations first
        if (isGlobalGenerating || generatingIds.size > 0) {
            await handleCancelAll();
        }

        try {
            const segmentIds = segments.map(s => s.id);
            if (segmentIds.length > 0) {
                // 1. Delete all job execution records (to prevent auto-healing)
                const { error: jobError } = await supabase
                    .from('video_jobs')
                    .delete()
                    .in('segment_id', segmentIds);

                if (jobError) console.error('Failed to delete video jobs:', jobError);
            }

            // 2. Clear video URLs
            const { error } = await supabase
                .from('segments')
                .update({ video_url: null } as never)
                .eq('project_id', projectId);

            if (error) throw error;

            setSegments(prev => prev.map(s => ({ ...s, video_url: null })));
            addLog('success', '🗑️ 모든 영상이 삭제되었습니다.');
        } catch (error) {
            console.error('Delete all videos error:', error);
            addLog('error', '전체 영상 삭제 실패');
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
                        type="button"
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
                        type="button"
                        onClick={handleDeleteAllVideos}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                        🗑️ 전체 삭제
                    </button>
                    <button
                        type="button"
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
            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                        <span className="font-medium">생성기</span>
                        <span className="text-gray-400">|</span>
                        <span>☁️ fal.ai 클라우드</span>
                    </div>
                    <div className="text-xs text-gray-600 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5">
                        예상 {(selectedResolutionOption?.creditsPerCut || 0) * 5} credits / 30초
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <label htmlFor="project-video-model" className="text-xs font-semibold tracking-wide text-gray-500 uppercase">비디오 모델</label>
                                <select
                                    id="project-video-model"
                                    value={selectedModel}
                                    onChange={(e) => {
                                        const nextModelId = e.target.value;
                                        const nextModel = videoModels.find((model) => model.id === nextModelId) || videoModels[0];
                                        setSelectedModel(nextModelId);
                                        if (nextModel?.resolutions[0]) {
                                            setSelectedResolution(nextModel.resolutions[0].id);
                                        }
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                    disabled={isGlobalGenerating || generatingIds.size > 0}
                                >
                                    {videoModels.map((model) => (
                                        <option key={model.id} value={model.id}>{model.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500">예상 {selectedResolutionOption?.creditsPerCut || 0} credits / 6초 컷</p>
                            </div>

                            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <label htmlFor="project-video-resolution" className="text-xs font-semibold tracking-wide text-gray-500 uppercase">화질</label>
                                <select
                                    id="project-video-resolution"
                                    value={selectedResolution}
                                    onChange={(e) => setSelectedResolution(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                    disabled={isGlobalGenerating || generatingIds.size > 0}
                                >
                                    {(selectedVideoModel?.resolutions || []).map((resolution) => (
                                        <option key={resolution.id} value={resolution.id}>{resolution.id}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500">권장 형식: MP4 / 24 FPS</p>
                            </div>
                        </div>

                        {selectedVideoModel?.description && (
                            <p className="text-xs text-gray-600 leading-relaxed">{selectedVideoModel.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                            <span>형식 <span className="text-gray-900 font-semibold">MP4</span></span>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <span>러닝타임 <span className="text-gray-900 font-semibold">컷당 6초</span></span>
                            <span className="w-px h-3 bg-gray-300"></span>
                            <span>FPS <span className="text-gray-900 font-semibold">24</span></span>
                        </div>
                    </div>

                    {selectedVideoModel && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">모델 미리보기</p>
                            <button
                                type="button"
                                className="relative overflow-hidden rounded-lg border border-gray-200 bg-slate-100 aspect-video cursor-zoom-in"
                                onMouseEnter={(event) => openModelHoverPreview(event.currentTarget)}
                                onMouseLeave={scheduleCloseModelHoverPreview}
                                onFocus={(event) => openModelHoverPreview(event.currentTarget)}
                                onBlur={scheduleCloseModelHoverPreview}
                                aria-label={`${selectedVideoModel.label} 확대 미리보기`}
                            >
                                {selectedVideoModel.previewVideoUrl && !failedModelPreviewVideoIds[selectedVideoModel.id] ? (
                                    <>
                                        {!readyModelPreviewVideoIds[selectedVideoModel.id] && (
                                            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
                                        )}
                                        <video
                                            src={selectedVideoModel.previewVideoUrl}
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${readyModelPreviewVideoIds[selectedVideoModel.id] ? 'opacity-100' : 'opacity-0'}`}
                                            muted
                                            loop
                                            autoPlay
                                            playsInline
                                            preload="auto"
                                            aria-label={`${selectedVideoModel.label} 미리보기 영상`}
                                            onLoadedData={() => markModelPreviewVideoReady(selectedVideoModel.id)}
                                            onError={() => markModelPreviewVideoFailed(selectedVideoModel.id)}
                                        >
                                            <track kind="captions" srcLang="ko" label="미리보기 자막" src="data:text/vtt,WEBVTT" />
                                        </video>
                                    </>
                                ) : (
                                    <img
                                        src={selectedVideoModel.previewImageUrl || selectedVideoModel.fallbackPreviewImageUrl || '/styles/cinematic.png'}
                                        alt={`${selectedVideoModel.label} 미리보기`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(event) => {
                                            const img = event.currentTarget;
                                            if (img.dataset.fallbackApplied === 'true') {
                                                return;
                                            }
                                            img.dataset.fallbackApplied = 'true';
                                            img.src = selectedVideoModel.fallbackPreviewImageUrl || '/styles/cinematic.png';
                                        }}
                                    />
                                )}
                            </button>
                            {modelHoverPreview && (
                                <div
                                    className="hidden md:block fixed z-[90] pointer-events-none"
                                    style={{ left: `${modelHoverPreview.left}px`, top: `${modelHoverPreview.top}px` }}
                                >
                                    <div className="w-[27rem] rounded-2xl border border-violet-200 bg-white/95 backdrop-blur-sm shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between px-1 pb-2">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Hover Preview</span>
                                            <span className="text-[11px] text-gray-500 truncate max-w-[180px]">{selectedVideoModel.label}</span>
                                        </div>
                                        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-slate-100 aspect-video">
                                            {selectedVideoModel.previewVideoUrl && !failedModelPreviewVideoIds[selectedVideoModel.id] ? (
                                                <>
                                                    {!readyModelPreviewVideoIds[selectedVideoModel.id] && (
                                                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
                                                    )}
                                                    <video
                                                        src={selectedVideoModel.previewVideoUrl}
                                                        className={`w-full h-full object-cover transition-opacity duration-300 ${readyModelPreviewVideoIds[selectedVideoModel.id] ? 'opacity-100' : 'opacity-0'}`}
                                                        muted
                                                        loop
                                                        autoPlay
                                                        playsInline
                                                        preload="auto"
                                                        aria-label={`${selectedVideoModel.label} 확대 미리보기 영상`}
                                                        onLoadedData={() => markModelPreviewVideoReady(selectedVideoModel.id)}
                                                        onError={() => markModelPreviewVideoFailed(selectedVideoModel.id)}
                                                    >
                                                        <track kind="captions" srcLang="ko" label="확대 미리보기 자막" src="data:text/vtt,WEBVTT" />
                                                    </video>
                                                </>
                                            ) : (
                                                <img
                                                    src={selectedVideoModel.previewImageUrl || selectedVideoModel.fallbackPreviewImageUrl || '/styles/cinematic.png'}
                                                    alt={`${selectedVideoModel.label} 확대 미리보기`}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    onError={(event) => {
                                                        const img = event.currentTarget;
                                                        if (img.dataset.fallbackApplied === 'true') {
                                                            return;
                                                        }
                                                        img.dataset.fallbackApplied = 'true';
                                                        img.src = selectedVideoModel.fallbackPreviewImageUrl || '/styles/cinematic.png';
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
                <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
                        <div className="max-h-[62vh] overflow-y-auto pr-1.5 space-y-2">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-400">불러오는 중...</div>
                            ) : segments.map((seg, index) => (
                                <button
                                    key={seg.id}
                                    type="button"
                                    onClick={() => setSelectedSegmentId(seg.id)}
                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all
                                        ${selectedSegmentId === seg.id
                                            ? 'border-violet-600 bg-violet-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
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
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0 || isLoading}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                        >
                            ◀ 이전
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                            {currentPage + 1} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) - 1 || isLoading}
                            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                        >
                            다음 ▶
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Preview Area */}
                    {selectedSegment ? (
                        <div className="space-y-4">
                            <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden border flex items-center justify-center relative shadow-lg">
                                {selectedSegment.video_url ? (
                                    <>
                                        <video
                                            src={selectedSegment.video_url}
                                            className="w-full h-full object-contain"
                                            controls
                                            autoPlay
                                            loop
                                        >
                                            <track kind="captions" srcLang="ko" label="프리뷰 자막" src="data:text/vtt,WEBVTT" />
                                        </video>
                                        <button
                                            type="button"
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
                                            type="button"
                                            onClick={() => handleGenerateVideo(selectedSegment, false, videoPrompt)}
                                            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                                        >
                                            현재 컷 생성하기
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="video-motion-prompt" className="text-sm font-semibold text-gray-700 block">
                                        비디오 모션 프롬프트
                                        <span className="text-xs font-normal text-gray-500 ml-2">(비어두면 AI가 자동으로 생성합니다)</span>
                                    </label>
                                    <textarea
                                        id="video-motion-prompt"
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
                        <div className="h-64 rounded-2xl border bg-white flex items-center justify-center text-gray-400">
                            왼쪽에서 컷을 선택해 주세요.
                        </div>
                    )}

                    {/* Status & Log Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[420px]">
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
                                    type="button"
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
                            <div className="flex-1 bg-gray-900 text-gray-100 overflow-hidden flex flex-col min-h-[190px]">
                                <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 text-xs">
                                    <span className="font-bold text-gray-400">📋 시스템 로그</span>
                                    <button type="button" onClick={() => { /* clear logs if needed */ }} className="text-gray-500 hover:text-gray-300">지우기</button>
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
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/image`} className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 이전 단계
                </Link>
                <button
                    type="button"
                    onClick={() => router.push(`/project/${projectId}/preview`)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
