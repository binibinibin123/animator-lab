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

    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

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

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/video/generate?requestId=${requestId}&segmentId=${segmentId}`);
                if (!res.ok) throw new Error('Polling failed');
                const data = await res.json();

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval);
                    delete pollingIntervals.current[segmentId];
                    setGeneratingIds(prev => {
                        const next = new Set(prev);
                        next.delete(segmentId);
                        return next;
                    });

                    if (data.status === 'completed') {
                        setSegments(prev => prev.map(s =>
                            s.id === segmentId ? { ...s, video_url: data.videoUrl } : s
                        ));
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                clearInterval(interval);
                delete pollingIntervals.current[segmentId];
            }
        }, 5000);

        pollingIntervals.current[segmentId] = interval;
    };

    const handleGenerateVideo = async (segment: Segment) => {
        if (!segment.image_url) {
            alert('이미지를 먼저 생성해 주세요.');
            return;
        }

        setGeneratingIds(prev => new Set(prev).add(segment.id));
        try {
            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: segment.image_url,
                    segmentId: segment.id,
                    model: selectedModel,
                }),
            });

            if (!response.ok) throw new Error('Failed to start video generation');
            const data = await response.json();

            if (data.status === 'in_progress') {
                startPolling(segment.id, data.requestId);
            }
        } catch (error) {
            console.error('Video Generation Error:', error);
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
