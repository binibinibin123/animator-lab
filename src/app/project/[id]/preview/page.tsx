// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Project, Segment } from '@/types/database';
import { Player } from '@remotion/player';
import { MainVideo } from '@/remotion/compositions/MainVideo';
import { SUBTITLE_STYLES } from '@/remotion/constants/subtitleStyles';
import LogViewer, { LogMessage } from '@/components/ui/LogViewer';

export default function PreviewPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendering, setIsRendering] = useState(false);
    const [subtitleStyle, setSubtitleStyle] = useState('default');
    const [padding, setPadding] = useState(0.5);
    const [transitionType, setTransitionType] = useState('slide');

    // Logging State (Rendering)
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [renderStatus, setRenderStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

    // Data Loading Log State
    const [dataLogs, setDataLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string }>>([]);
    const [showDataLogs, setShowDataLogs] = useState(true);
    const dataLogsEndRef = useRef<HTMLDivElement>(null);

    const addDataLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setDataLogs(prev => [...prev.slice(-50), { time, type, message }]);
        setTimeout(() => dataLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectData();
        }
    }, [projectId]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        setDataLogs([]);
        addDataLog('info', '📦 프로젝트 정보 로딩 중...');

        try {
            // 1. Load Project Info
            const { data: proj, error: projError } = await supabase.from('projects').select('*').eq('id', projectId).single();
            if (projError) {
                addDataLog('error', `프로젝트 로드 실패: ${projError.message}`);
            } else if (proj) {
                setProject(proj as Project);
                addDataLog('success', `✅ 프로젝트 로드 완료: ${proj.title}`);
            }

            // 2. Load Segment Metadata (Lightweight)
            addDataLog('info', '🎬 세그먼트 메타데이터 로딩 중...');
            const { data: segs, error: segsError } = await supabase
                .from('segments')
                .select('id, order_index, script_text, duration_ms')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (segsError) {
                addDataLog('error', `세그먼트 로드 실패: ${segsError.message}`);
                setIsLoading(false);
                return;
            }

            if (segs) {
                addDataLog('info', `${segs.length}개 세그먼트 발견. 미디어 URL 로딩 중...`);
                setSegments(segs as Segment[]);

                // 3. Progressive Media Loading
                let loadedCount = 0;
                for (const seg of segs) {
                    const { data: mediaData } = await supabase
                        .from('segments')
                        .select('id, image_url, video_url, audio_url')
                        .eq('id', seg.id)
                        .single();

                    if (mediaData) {
                        setSegments(prev => prev.map(s =>
                            s.id === mediaData.id ? { ...s, ...mediaData } : s
                        ));
                    }
                    loadedCount++;
                    if (loadedCount % 10 === 0 || loadedCount === segs.length) {
                        addDataLog('info', `미디어 로드 진행: ${loadedCount}/${segs.length}`);
                    }
                }
                addDataLog('success', `✅ 전체 로드 완료 (${segs.length}개 세그먼트)`);
            }
        } catch (err: any) {
            addDataLog('error', `예상치 못한 오류: ${err.message}`);
        }
        setIsLoading(false);
    };

    // Remotion 용 데이터 변환
    const remotionSegments = segments.map(s => ({
        id: s.id,
        video_url: s.video_url,
        audio_url: s.audio_url,
        image_url: s.image_url,
        script_text: s.script_text,
        duration: (s.duration_ms || 3000) / 1000
    }));

    const totalDurationInFrames = remotionSegments.reduce((acc, seg) => {
        // Duration + Padding calculation
        // 30fps 기준
        const durationWithPadding = seg.duration + padding;
        return acc + Math.max(Math.floor(durationWithPadding * 30), 1);
    }, 0) + (transitionType === 'none' ? 0 : 20);

    const handleDownload = async (type: 'mp4' | 'srt' | 'thumbnail') => {
        if (type === 'mp4') {
            setIsRendering(true);
            setRenderStatus('running');
            setLogs([]); // 초기화
            setProgress(0);
            setRenderedVideoUrl(null);

            try {
                const response = await fetch('/api/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        segments: remotionSegments,
                        subtitleStyle,
                        settings: {
                            padding,
                            transitionType
                        }
                    })
                });

                if (!response.ok) throw new Error('Failed to start render');

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (!reader) throw new Error('No response body');

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n\n');

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            const eventName = line.split('\n')[0].replace('event: ', '');
                            const dataStr = line.split('\n')[1]?.replace('data: ', '');

                            if (!dataStr) continue;

                            try {
                                const data = JSON.parse(dataStr);

                                if (eventName === 'log') {
                                    setLogs(prev => [...prev, { message: data.message, timestamp: data.timestamp }]);
                                } else if (eventName === 'progress') {
                                    setProgress(data.progress);
                                } else if (eventName === 'result') {
                                    // Filename received, construct download URL
                                    const downloadUrl = `/api/download?filename=${data.filename}`;
                                    setRenderedVideoUrl(downloadUrl);
                                } else if (eventName === 'completed') {
                                    setRenderStatus('completed');
                                } else if (eventName === 'error') {
                                    setRenderStatus('error');
                                    setLogs(prev => [...prev, { message: `❌ Error: ${data.message}`, timestamp: Date.now() }]);
                                    throw new Error(data.message);
                                }
                            } catch (e) {
                                console.error('Parse error', e);
                            }
                        }
                    }
                }

                // alert('✅ 렌더링 및 다운로드가 완료되었습니다!');

            } catch (e: any) {
                console.error(e);
                setRenderStatus('error');
                setLogs(prev => [...prev, { message: `FATAL: ${e.message}`, timestamp: Date.now() }]);
                alert('❌ 렌더링 실패: ' + e.message);
            } finally {
                setIsRendering(false);
            }
        } else if (type === 'thumbnail' && segments[0]?.image_url) {
            window.open(segments[0].image_url, '_blank');
        } else {
            alert(`${type} 다운로드 기능은 준비 중입니다.`);
        }
    };

    const totalDuration = segments.reduce((acc, s) => acc + (s.duration_ms || 0), 0);
    const minutes = Math.floor(totalDuration / 60000);
    const seconds = Math.floor((totalDuration % 60000) / 1000);

    const width = project?.aspect_ratio === '9:16' ? 1080 : 1920;
    const height = project?.aspect_ratio === '9:16' ? 1920 : 1080;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">영상 확인 (Remotion)</h2>
                    <p className="text-gray-500 mt-1">완성된 프로젝트를 검토하고 결과를 다운로드하세요.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        대시보드로 이동
                    </button>
                    <button
                        onClick={() => alert('프로젝트가 완료되었습니다!')}
                        className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        프로젝트 완료 ✅
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Video Player */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-100 flex items-center justify-center relative shadow-2xl" style={{ aspectRatio: '16/9' }}>
                        {segments.length > 0 ? (
                            <Player
                                component={MainVideo}
                                inputProps={{
                                    segments: remotionSegments,
                                    subtitleStyle,
                                    settings: {
                                        padding,
                                        transitionType
                                    }
                                }}
                                durationInFrames={totalDurationInFrames || 30 * 5}
                                compositionWidth={width}
                                compositionHeight={height}
                                fps={30}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                }}
                                controls
                                autoPlay
                            />
                        ) : (
                            <div className="text-center text-gray-400">
                                <div className="text-5xl mb-4">🎬</div>
                                <p className="text-lg">영상이 준비되지 않았습니다</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Controls & Options */}
                <div className="space-y-6">
                    {/* Subtitle Style Selector */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span>🎨 자막 스타일</span>
                            <span className="text-xs font-normal text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">New</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(SUBTITLE_STYLES).map(([key, style]) => (
                                <button
                                    key={key}
                                    onClick={() => setSubtitleStyle(key)}
                                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all
                                        ${subtitleStyle === key
                                            ? 'border-violet-600 bg-violet-50 text-violet-700'
                                            : 'border-gray-100 hover:border-gray-300 text-gray-600'}
                                    `}
                                >
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timing & Transition Settings */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span>⏱️ 타이밍 및 효과</span>
                        </h3>

                        {/* Padding Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <label className="font-medium text-gray-700">여유 시간 (Padding)</label>
                                <span className="text-violet-600 font-bold">{padding}초</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={padding}
                                onChange={(e) => setPadding(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                            <p className="text-xs text-gray-500">대사가 끝난 후 다음 장면으로 넘어갈 때까지의 여유 시간입니다.</p>
                        </div>

                        {/* Transition Selector */}
                        <div className="space-y-3">
                            <label className="font-medium text-sm text-gray-700 block">화면 전환 효과</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'none', label: 'None (컷)', icon: '⚡' },
                                    { id: 'fade', label: 'Fade (부드럽게)', icon: '🌫️' },
                                    { id: 'slide', label: 'Slide (밀기)', icon: '➡️' },
                                    { id: 'wipe', label: 'Wipe (닦기)', icon: '🧹' },
                                    { id: 'mixed', label: 'Mixed (자동)', icon: '🔀' }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTransitionType(t.id)}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2
                                            ${transitionType === t.id
                                                ? 'border-violet-600 bg-violet-50 text-violet-700 ring-1 ring-violet-600'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <span>{t.icon}</span>
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Video Info Grid (Compact) */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm text-sm space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500">총 길이</span>
                            <span className="font-bold text-gray-900">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">해상도</span>
                            <span className="font-bold text-gray-900">{width}x{height}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">컷 수</span>
                            <span className="font-bold text-gray-900">{segments.length} Cut</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Options */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800">결과물 내보내기</h3>
                <div className="grid grid-cols-3 gap-6">
                    <button
                        onClick={() => !isRendering && handleDownload('mp4')}
                        disabled={isRendering}
                        className={`group p-6 bg-white border-2 rounded-2xl transition-all text-left relative overflow-hidden
                            ${isRendering ? 'border-violet-300 bg-violet-50 cursor-wait' : 'hover:border-violet-600 hover:bg-violet-50'}
                        `}
                    >
                        {isRendering && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-xs font-bold text-violet-700">렌더링 중...</p>
                                </div>
                            </div>
                        )}
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            🎬
                        </div>
                        <p className="font-bold text-gray-900 group-hover:text-violet-700">MP4 고화질 영상</p>
                        <p className="text-sm text-gray-500 mt-1">SNS 및 유튜브 업로드용 (서버 렌더링)</p>
                    </button>
                    <button
                        onClick={() => handleDownload('srt')}
                        className="group p-6 bg-white border-2 rounded-2xl hover:border-violet-600 hover:bg-violet-50 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            📝
                        </div>
                        <p className="font-bold text-gray-900 group-hover:text-violet-700">SRT 자막 파일</p>
                        <p className="text-sm text-gray-500 mt-1">검수용 텍스트 자막</p>
                    </button>
                    <button
                        onClick={() => handleDownload('thumbnail')}
                        className="group p-6 bg-white border-2 rounded-2xl hover:border-violet-600 hover:bg-violet-50 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            🖼️
                        </div>
                        <p className="font-bold text-gray-900 group-hover:text-violet-700">AI 유튜브 썸네일</p>
                        <p className="text-sm text-gray-500 mt-1">클릭을 부르는 대표 이미지</p>
                    </button>
                </div>
            </div>

            {/* Log Viewer for Rendering */}
            {(renderStatus !== 'idle') && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-bold text-gray-800">렌더링 로그</h3>
                    <LogViewer
                        logs={logs}
                        status={renderStatus}
                        progress={progress}
                        title="remotion-renderer"
                    />

                    {/* Result Video */}
                    {renderedVideoUrl && (
                        <div className="bg-white p-6 rounded-2xl border-2 border-green-100 shadow-xl space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
                                <span>🎉 렌더링 성공!</span>
                            </div>

                            <div className="overflow-hidden rounded-xl bg-black aspect-video border border-gray-100">
                                <video
                                    src={renderedVideoUrl}
                                    controls
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="flex justify-end">
                                <a
                                    href={renderedVideoUrl}
                                    download={`project-${projectId}.mp4`}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    <span>📥 MP4 파일 저장하기</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-8 border-t">
                <Link href={`/project/${projectId}/video`} className="px-6 py-2 text-gray-500 hover:text-gray-800 font-medium">
                    ← 편집 단계로 돌아가서 수정하기
                </Link>
            </div>
            {/* Data Loading Log Panel */}
            {showDataLogs && dataLogs.length > 0 && (
                <div className="fixed right-4 top-20 w-96 max-h-[70vh] bg-gray-900 text-gray-100 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                        <span className="text-sm font-bold">📋 데이터 로딩 로그</span>
                        <div className="flex gap-2">
                            <button onClick={() => setDataLogs([])} className="text-xs text-gray-400 hover:text-white">지우기</button>
                            <button onClick={() => setShowDataLogs(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                    </div>
                    <div className="p-3 overflow-y-auto max-h-[60vh] font-mono text-xs space-y-1">
                        {dataLogs.map((log, i) => (
                            <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'warn' ? 'text-yellow-400' :
                                        'text-gray-300'
                                }`}>
                                <span className="text-gray-500 flex-shrink-0">{log.time}</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        <div ref={dataLogsEndRef} />
                    </div>
                </div>
            )}

            {!showDataLogs && dataLogs.length > 0 && (
                <button
                    onClick={() => setShowDataLogs(true)}
                    className="fixed right-4 top-20 px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm hover:bg-gray-800 z-50"
                >
                    📋 로그 보기
                </button>
            )}
        </div>
    );
}
