'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Project, Segment } from '@/types/database';

export default function PreviewPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);

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

    const handleDownload = (type: 'mp4' | 'srt' | 'thumbnail') => {
        if (type === 'mp4' && segments[0]?.video_url) {
            window.open(segments[0].video_url, '_blank');
        } else if (type === 'thumbnail' && segments[0]?.image_url) {
            window.open(segments[0].image_url, '_blank');
        } else {
            alert(`${type} 다운로드 기능은 준비 중입니다.`);
        }
    };

    const totalDuration = segments.reduce((acc, s) => acc + (s.duration_ms || 0), 0);
    const minutes = Math.floor(totalDuration / 60000);
    const seconds = Math.floor((totalDuration % 60000) / 1000);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">영상 확인</h2>
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
            <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-100 flex items-center justify-center relative shadow-2xl">
                {segments.length > 0 && segments[currentPlayingIndex]?.video_url ? (
                    <video
                        key={segments[currentPlayingIndex].id}
                        src={segments[currentPlayingIndex].video_url}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        onEnded={() => {
                            if (currentPlayingIndex < segments.length - 1) {
                                setCurrentPlayingIndex(prev => prev + 1);
                            } else {
                                setCurrentPlayingIndex(0);
                            }
                        }}
                    />
                ) : (
                    <div className="text-center text-gray-400">
                        <div className="text-5xl mb-4">🎬</div>
                        <p className="text-lg">영상이 준비되지 않았습니다</p>
                    </div>
                )}
                {segments.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white">
                        CUT {currentPlayingIndex + 1} / {segments.length}
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
                    <p className="text-xl font-bold text-gray-900">{project?.aspect_ratio === '9:16' ? '1080x1920' : '1920x1080'}</p>
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
                        onClick={() => handleDownload('mp4')}
                        className="group p-6 bg-white border-2 rounded-2xl hover:border-violet-600 hover:bg-violet-50 transition-all text-left"
                    >
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                            🎬
                        </div>
                        <p className="font-bold text-gray-900 group-hover:text-violet-700">MP4 고화질 영상</p>
                        <p className="text-sm text-gray-500 mt-1">SNS 및 유튜브 업로드용</p>
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
