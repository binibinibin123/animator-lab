'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

export default function ImagePage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resolution, setResolution] = useState<'2K' | '4K'>('2K');
    const [customPrompt, setCustomPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (projectId) {
            fetchSegments();
        }
    }, [projectId]);

    useEffect(() => {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg) {
            setCustomPrompt(seg.visual_description || '');
        }
    }, [selectedSegmentId, segments]);

    const fetchSegments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('segments')
                .select('*')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (fetchError) throw fetchError;

            if (data) {
                setSegments(data as Segment[]);
                if (data.length > 0 && !selectedSegmentId) {
                    setSelectedSegmentId((data as Segment[])[0].id);
                }
            }
        } catch (err: any) {
            console.error('Error loading segments:', err);
            setError(err.message || '데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedSegment = segments.find(s => s.id === selectedSegmentId);

    const handleGenerateImage = async (segment: Segment) => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: customPrompt || undefined,
                    scriptText: segment.script_text,
                    segmentId: segment.id,
                    resolution,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate image');
            const data = await response.json();

            setSegments(prev => prev.map(s =>
                s.id === segment.id ? { ...s, image_url: data.imageUrl } : s
            ));
            setCustomPrompt('');
        } catch (error) {
            console.error('Image Error:', error);
            alert('이미지 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        setIsGenerating(true);
        for (const segment of segments) {
            if (!segment.image_url) {
                await handleGenerateImage(segment);
            }
        }
        setIsGenerating(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">이미지 생성</h2>
                    <p className="text-gray-500 mt-1">각 컷에 어울리는 고품질 이미지를 생성합니다.</p>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                    {isGenerating ? '생성 중...' : '▶ 전체 생성'}
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">추천 모델:</span>
                    <select className="px-3 py-1.5 border rounded-lg text-sm bg-white">
                        <option>🎨 Nano Banana (Standard)</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">해상도:</span>
                    <div className="flex bg-white border rounded-lg p-1">
                        <button
                            onClick={() => setResolution('2K')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${resolution === '2K' ? 'bg-violet-600 text-white' : 'hover:bg-gray-50'}`}
                        >
                            2K
                        </button>
                        <button
                            onClick={() => setResolution('4K')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${resolution === '4K' ? 'bg-violet-600 text-white' : 'hover:bg-gray-50'}`}
                        >
                            4K
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Segment List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400">데이터를 불러오는 중...</div>
                    ) : error ? (
                        <div className="p-8 text-center space-y-4">
                            <p className="text-red-500">{error}</p>
                            <button onClick={fetchSegments} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                                🔄 다시 시도
                            </button>
                        </div>
                    ) : segments.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            생성된 컷이 없습니다.
                            <Link href={`/project/${projectId}/script`} className="text-violet-600 underline text-sm mt-2 inline-block">
                                스크립트로 돌아가기
                            </Link>
                        </div>
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
                                <div className="w-20 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    {seg.image_url ? (
                                        <img src={seg.image_url} alt={`Cut ${index + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-violet-600 mb-1">CUT #{index + 1}</p>
                                    <p className="text-sm text-gray-600 truncate">{seg.script_text}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main Edit Area */}
                <div className="col-span-2 space-y-6">
                    {selectedSegment ? (
                        <div className="space-y-6">
                            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border relative">
                                {selectedSegment.image_url ? (
                                    <img src={selectedSegment.image_url} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                                        <span className="text-4xl">📸</span>
                                        <p>이미지가 생성되지 않았습니다</p>
                                    </div>
                                )}
                                {isGenerating && selectedSegmentId === selectedSegment.id && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-violet-600 font-medium">이미지 생성 중...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 block">이미지 프롬프트 (선택사항)</label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="비어두면 대본에 따라 자동으로 프롬프트가 생성됩니다..."
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        💡 대본: "{selectedSegment.script_text.slice(0, 50)}..."
                                    </p>
                                    <button
                                        onClick={() => handleGenerateImage(selectedSegment)}
                                        disabled={isGenerating}
                                        className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                                    >
                                        {selectedSegment.image_url ? '다시 생성하기' : '이미지 생성'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            왼쪽에서 컷을 선택해 주세요.
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/voice`} className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 이전 단계
                </Link>
                <button
                    onClick={() => router.push(`/project/${projectId}/video`)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
