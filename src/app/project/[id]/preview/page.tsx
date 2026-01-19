// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Project, Segment } from '@/types/database';
import { Player } from '@remotion/player';
import { MainVideo } from '@/remotion/compositions/MainVideo';

export default function PreviewPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendering, setIsRendering] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProjectData();
        }
    }, [projectId]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
        const { data: segs } = await supabase.from('segments').select('*').eq('project_id', projectId).order('order_index', { ascending: true });

        if (proj) setProject(proj as Project);
        if (segs) setSegments(segs);
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
        return acc + Math.max(Math.floor(seg.duration * 30), 1);
    }, 0);

    const handleDownload = async (type: 'mp4' | 'srt' | 'thumbnail') => {
        if (type === 'mp4') {
            try {
                setIsRendering(true);
                const response = await fetch('/api/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ segments: remotionSegments })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Render failed');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `project-${projectId}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('✅ 다운로드가 완료되었습니다!');
            } catch (e: any) {
                console.error(e);
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
        <div className="space-y-8">
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

            {/* Video Player */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-100 flex items-center justify-center relative shadow-2xl" style={{ aspectRatio: '16/9' }}>
                {segments.length > 0 ? (
                    <Player
                        component={MainVideo}
                        inputProps={{ segments: remotionSegments }}
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

            {/* Video Info Grid */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-5 bg-white border rounded-2xl text-center shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">총 길이</p>
                    <p className="text-xl font-bold text-gray-900">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                </div>
                <div className="p-5 bg-white border rounded-2xl text-center shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">해상도</p>
                    <p className="text-xl font-bold text-gray-900">{width}x{height}</p>
                </div>
                <div className="p-5 bg-white border rounded-2xl text-center shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">스타일</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">{project?.style || 'Standard'}</p>
                </div>
                <div className="p-5 bg-white border rounded-2xl text-center shadow-sm">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">컷 구성</p>
                    <p className="text-xl font-bold text-gray-900">{segments.length} Segments</p>
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

            {/* Navigation */}
            <div className="flex justify-between pt-8 border-t">
                <Link href={`/project/${projectId}/video`} className="px-6 py-2 text-gray-500 hover:text-gray-800 font-medium">
                    ← 편집 단계로 돌아가서 수정하기
                </Link>
            </div>
        </div>
    );
}
