'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

export default function UpscalePage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [upscalingIds, setUpscalingIds] = useState<Set<string>>(new Set());

    // Global Upscale State
    const [isGlobalUpscaling, setIsGlobalUpscaling] = useState(false);

    // Logs
    const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string }>>([]);
    const [showLogs, setShowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-50), { time, type, message }]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (projectId) fetchSegments();
    }, [projectId]);

    const fetchSegments = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('segments')
                .select('id, order_index, script_text, video_url, upscaled_video_url, duration_ms')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (error) {
                addLog('error', `세그먼트 로딩 실패: ${error.message}`);
            } else if (data) {
                setSegments(data as Segment[]);
                addLog('success', `${data.length}개 세그먼트 로드 완료`);
                if (data.length > 0 && !selectedSegmentId) {
                    // Fix: Explicit cast to any or Segment to avoid 'never' type issue
                    setSelectedSegmentId((data as any)[0].id);
                }
            }
        } catch (e: any) {
            addLog('error', e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpscaleSegment = async (segmentId: string) => {
        const seg = segments.find(s => s.id === segmentId);
        if (!seg?.video_url) {
            addLog('error', '영상이 없어 업스케일할 수 없습니다.');
            return;
        }

        setUpscalingIds(prev => new Set(prev).add(segmentId));
        addLog('info', `세그먼트 ${segmentId.slice(0, 8)}... 업스케일 시작`);

        try {
            const response = await fetch('/api/upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segment_id: segmentId,
                    video_url: seg.video_url
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upscale failed');
            }

            const result = await response.json();
            addLog('success', `✅ 업스케일 완료: ${segmentId.slice(0, 8)}...`);

            // Update segment with upscaled URL
            setSegments(prev => prev.map(s =>
                s.id === segmentId ? { ...s, upscaled_video_url: result.upscaled_video_url } : s
            ));

        } catch (e: any) {
            addLog('error', `❌ 업스케일 실패: ${e.message}`);
        } finally {
            setUpscalingIds(prev => {
                const next = new Set(prev);
                next.delete(segmentId);
                return next;
            });
        }
    };

    const handleUpscaleAll = async () => {
        const withVideo = segments.filter(s => s.video_url && !s.upscaled_video_url);
        if (withVideo.length === 0) {
            addLog('warn', '업스케일할 세그먼트가 없습니다.');
            return;
        }

        setIsGlobalUpscaling(true);
        addLog('info', `${withVideo.length}개 세그먼트 전체 업스케일 시작...`);

        for (const seg of withVideo) {
            if (!isGlobalUpscaling) break; // Allow cancellation
            await handleUpscaleSegment(seg.id);
        }

        setIsGlobalUpscaling(false);
        addLog('success', '🎉 전체 업스케일 완료!');
    };

    // Render State
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

    const handleFinalRender = async () => {
        setIsRendering(true);
        setRenderProgress(0);
        setRenderedUrl(null);
        addLog('info', '🎬 60fps 최종 렌더링 시작...');

        try {
            // Load saved settings
            const saved = localStorage.getItem(`project_settings_${projectId}`);
            let settings = { padding: 0.5, transitionType: 'slide', subtitleStyle: 'default' };
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    settings = { ...settings, ...parsed };
                    addLog('info', `설정 로드됨: Padding=${settings.padding}, Transition=${settings.transitionType}`);
                } catch (e) {
                    console.error('Failed to parse settings', e);
                }
            }

            // Prepare segments payload (use upscaled URL if available, fallback to original)
            const renderSegments = segments.map(s => ({
                id: s.id,
                video_url: s.upscaled_video_url || s.video_url, // Prefer upscaled
                audio_url: s.audio_url,
                image_url: s.image_url,
                script_text: s.script_text,
                duration: (s.duration_ms || 3000) / 1000
            }));

            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segments: renderSegments,
                    subtitleStyle: settings.subtitleStyle,
                    settings: {
                        padding: settings.padding,
                        transitionType: settings.transitionType
                    },
                    fps: 60,
                    skipSubtitles: false // Enable subtitles for final render
                })
            });

            if (!response.ok) throw new Error('Render failed to start');

            // Handle SSE
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const eventMatch = line.match(/event: (\w+)/);
                    const dataMatch = line.match(/data: (.+)/);

                    if (eventMatch && dataMatch) {
                        try {
                            const eventName = eventMatch[1];
                            const data = JSON.parse(dataMatch[1]);

                            if (eventName === 'progress') {
                                setRenderProgress(data.progress);
                            } else if (eventName === 'result') {
                                const url = `/api/download?filename=${data.filename}`;
                                setRenderedUrl(url);
                                addLog('success', '🎉 렌더링 완료!');
                            } else if (eventName === 'error') {
                                throw new Error(data.message);
                            }
                        } catch (e) { console.error(e); }
                    }
                }
            }

        } catch (e: any) {
            addLog('error', `❌ 렌더링 실패: ${e.message}`);
        } finally {
            setIsRendering(false);
        }
    };

    const selectedSegment = segments.find(s => s.id === selectedSegmentId);
    const completedCount = segments.filter(s => s.upscaled_video_url).length;
    const totalWithVideo = segments.filter(s => s.video_url).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/project/${projectId}/preview`} className="text-gray-400 hover:text-gray-600">
                            ← 영상 확인
                        </Link>
                        <h1 className="text-xl font-bold text-gray-800">6. 업스케일</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{completedCount}/{totalWithVideo} 완료</span>
                        <button
                            onClick={handleFinalRender}
                            disabled={completedCount === 0 || isRendering}
                            className={`px-4 py-2 text-white rounded-lg transition-all ${isRendering
                                ? 'bg-violet-400 cursor-wait'
                                : completedCount === 0
                                    ? 'bg-gray-300 disabled:cursor-not-allowed'
                                    : 'bg-violet-600 hover:bg-violet-700'
                                }`}
                        >
                            {isRendering ? '⚡ 렌더링 중...' : '최종 렌더링 (60fps) →'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Render Progress Overlay */}
                {isRendering && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                                🎬 60fps 영상 렌더링 중...
                            </h3>
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                                <div
                                    className="bg-violet-600 h-full transition-all duration-300 relative"
                                    style={{ width: `${renderProgress * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                </div>
                            </div>
                            <p className="text-center text-gray-600 font-mono">
                                {Math.round(renderProgress * 100)}%
                            </p>
                            <p className="text-center text-xs text-gray-400 mt-2">
                                잠시만 기다려주세요. 약 1-2분 소요됩니다.
                            </p>
                        </div>
                    </div>
                )}

                {/* Render Result Modal */}
                {renderedUrl && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-4xl w-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-green-600">🎉 렌더링 완료!</h3>
                                <button onClick={() => setRenderedUrl(null)} className="text-gray-400 hover:text-gray-600">
                                    ❌
                                </button>
                            </div>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-6">
                                <video src={renderedUrl} controls className="w-full h-full" autoPlay />
                            </div>
                            <div className="flex justify-end gap-3">
                                <a
                                    href={renderedUrl}
                                    download
                                    className="px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 flex items-center gap-2"
                                >
                                    📥 다운로드
                                </a>
                                <button
                                    onClick={() => setRenderedUrl(null)}
                                    className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-8">
                    {/* ... (rest of the layout) */}
                    {/* Segment List */}
                    <div className="w-1/3">
                        <div className="bg-white rounded-2xl shadow-sm border p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-gray-800">세그먼트 목록</h2>
                                <button
                                    onClick={handleUpscaleAll}
                                    disabled={isGlobalUpscaling}
                                    className="px-3 py-1 text-sm bg-violet-600 text-white rounded-lg disabled:bg-violet-300"
                                >
                                    {isGlobalUpscaling ? '업스케일 중...' : '전체 업스케일'}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {segments.map((seg, i) => (
                                    <div
                                        key={seg.id}
                                        onClick={() => setSelectedSegmentId(seg.id)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all ${selectedSegmentId === seg.id
                                            ? 'bg-violet-100 border-2 border-violet-400'
                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-700">#{i + 1}</span>
                                            {upscalingIds.has(seg.id) ? (
                                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⏳ 업스케일 중</span>
                                            ) : seg.upscaled_video_url ? (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ 완료</span>
                                            ) : seg.video_url ? (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">대기 중</span>
                                            ) : (
                                                <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">영상 없음</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{seg.script_text?.slice(0, 50)}...</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview + Actions */}
                    <div className="flex-1 space-y-6">
                        {/* Video Preview */}
                        <div className="bg-white rounded-2xl shadow-sm border p-6">
                            <h2 className="font-bold text-gray-800 mb-4">미리보기</h2>
                            <div className="aspect-video bg-black rounded-xl overflow-hidden">
                                {selectedSegment?.upscaled_video_url ? (
                                    <video
                                        src={selectedSegment.upscaled_video_url}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : selectedSegment?.video_url ? (
                                    <video
                                        src={selectedSegment.video_url}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        영상 없음
                                    </div>
                                )}
                            </div>
                            {selectedSegment && (
                                <div className="mt-4 flex gap-4">
                                    <button
                                        onClick={() => handleUpscaleSegment(selectedSegment.id)}
                                        disabled={!selectedSegment.video_url || upscalingIds.has(selectedSegment.id)}
                                        className="px-4 py-2 bg-violet-600 text-white rounded-lg disabled:bg-gray-300"
                                    >
                                        {upscalingIds.has(selectedSegment.id) ? '업스케일 중...' : '이 세그먼트 업스케일'}
                                    </button>
                                    {selectedSegment.upscaled_video_url && (
                                        <span className="px-4 py-2 text-green-600">✅ 업스케일 완료</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Logs */}
                        <div className="bg-white rounded-2xl shadow-sm border p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-gray-800">로그</h3>
                                <button onClick={() => setShowLogs(!showLogs)} className="text-sm text-gray-500">
                                    {showLogs ? '접기' : '펼치기'}
                                </button>
                            </div>
                            {showLogs && (
                                <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm font-mono max-h-48 overflow-y-auto">
                                    {logs.map((log, i) => (
                                        <div key={i} className={`${log.type === 'error' ? 'text-red-400' :
                                            log.type === 'warn' ? 'text-yellow-400' :
                                                log.type === 'success' ? 'text-green-400' : 'text-gray-400'
                                            }`}>
                                            [{log.time}] {log.message}
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
