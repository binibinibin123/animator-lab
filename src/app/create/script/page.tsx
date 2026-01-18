'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function ScriptPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');
    const isValidProjectId = projectId && projectId !== 'null' && projectId !== 'undefined';

    const [title, setTitle] = useState('');
    const [script, setScript] = useState('');
    const [duration, setDuration] = useState(60);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load existing data
    useEffect(() => {
        if (!isValidProjectId) {
            // Redirect removed for debugging
            console.warn('Invalid Project ID on mount');
            return;
        }

        const fetchProject = async () => {
            if (!projectId) return;

            setIsLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('title, topic, duration')
                .eq('id', projectId)
                .single();

            if (data && !error) {
                setTitle(data.title || '');
                setScript(data.topic || '');
                if (data.duration) setDuration(data.duration);
            }
            setIsLoading(false);
        };

        fetchProject();
    }, [projectId, isValidProjectId, router]);

    const handleGenerate = async () => {
        if (!isValidProjectId) {
            alert('프로젝트 ID가 유효하지 않습니다.');
            return;
        }

        if (!script) {
            alert('주제나 대본을 입력해주세요.');
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch('/api/script/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: script,
                    duration,
                    projectId,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate script');

            const data = await response.json();
            setTitle(data.title || title);
            // After generation, we skip to next step or show segments
            router.push(`/create/voice?projectId=${projectId}`);
        } catch (error) {
            console.error('Error generating script:', error);
            alert('대본 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (!isValidProjectId) {
            alert('프로젝트 ID가 유효하지 않습니다.');
            return;
        }
        router.push(`/create/voice?projectId=${projectId}`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">어떤 영상을 만들고 싶으세요?</h2>
                <p className="text-gray-500 mt-1">주제나 대본을 입력하면 구조화를 도와드립니다.</p>
            </div>

            {/* Project Title */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    프로젝트 제목
                    <button className="text-gray-400 hover:text-gray-600">✏️</button>
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="새 프로젝트"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
            </div>

            {/* Script Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">💡 대본 / 프롬프트</label>
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="예시: '인공지능이 언어 교육 시스템에 미치는 영향을 설명해주세요...'"
                    rows={8}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-between text-sm text-gray-500">
                    <span>{script.length} / 5,000자</span>
                    <span>추천: 60초당 약 150단어</span>
                </div>
            </div>

            {/* Duration & Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-600">영상 길이:</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            min={30}
                            max={600}
                            className="w-20 px-3 py-1 border rounded-lg text-center"
                        />
                        <span className="text-gray-600">초</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="px-4 py-2 border border-violet-600 text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                        📁 음성 업로드
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        {isGenerating ? '생성 중...' : '🪄 대본 생성하기'}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link
                    href={`/create${projectId ? `?projectId=${projectId}` : ''}`}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                    ← 이전 단계
                </Link>
                <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
