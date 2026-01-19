'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AspectRatio } from '@/types';

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string; desc: string }[] = [
    { value: '16:9', label: '16:9', icon: '🖥️', desc: '유튜브 표준' },
    { value: '1:1', label: '1:1', icon: '⬜', desc: '인스타그램, 소셜' },
    { value: '3:4', label: '3:4', icon: '📱', desc: '포트레이트' },
    { value: '9:16', label: '9:16', icon: '📱', desc: '쇼츠, 릴스' },
];

const STYLES = [
    { id: 'economy-1', name: '경제유튜브 1', thumbnail: '/styles/economy-1.png' },
    { id: 'anime', name: '애니메이션', thumbnail: '/styles/anime.png' },
    { id: 'realistic', name: '실사', thumbnail: '/styles/realistic.png' },
    { id: 'digital-art', name: '디지털아트', thumbnail: '/styles/digital-art.png' },
    { id: 'illustration', name: '일러스트', thumbnail: '/styles/illustration.png' },
    { id: 'cinematic', name: '시네마틱', thumbnail: '/styles/cinematic.png' },
    { id: 'cartoon', name: '카툰', thumbnail: '/styles/cartoon.png' },
    { id: 'watercolor', name: '수채화', thumbnail: '/styles/watercolor.png' },
    { id: 'minimalist', name: '미니멀', thumbnail: '/styles/minimalist.png' },
    { id: '3d-render', name: '3D 렌더', thumbnail: '/styles/3d-render.png' },
    { id: 'vintage', name: '빈티지', thumbnail: '/styles/vintage.png' },
    { id: 'neon', name: '네온', thumbnail: '/styles/neon.png' },
    { id: 'sketch', name: '스케치', thumbnail: '/styles/sketch.png' },
];

const VIDEO_PROVIDERS = [
    { id: 'fal', name: 'fal.ai (클라우드)', icon: '☁️', desc: '빠르고 안정적, 유료 API' },
    { id: 'comfyui', name: 'ComfyUI (로컬)', icon: '💻', desc: '무료, 로컬 GPU 필요' },
];

export default function NewProjectPage() {
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [selectedStyle, setSelectedStyle] = useState<string>('anime');
    const [customStyle, setCustomStyle] = useState<string>('');
    const [videoProvider, setVideoProvider] = useState<string>('fal');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleNext = async () => {
        setIsSubmitting(true);
        const styleToUse = selectedStyle === 'custom' ? customStyle : selectedStyle;

        if (selectedStyle === 'custom' && !customStyle.trim()) {
            alert('커스텀 스타일 프롬프트를 입력해주세요.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aspectRatio,
                    style: styleToUse,
                    videoProvider,
                }),
            });

            if (!response.ok) throw new Error('Failed to create project');

            const { project } = await response.json();
            // 새 URL 구조: /project/[id]/script로 이동
            router.push(`/project/${project.id}/script`);
        } catch (error) {
            console.error('Error creating project:', error);
            alert('프로젝트 생성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">새 프로젝트 만들기</h2>
                <p className="text-gray-500 mt-1">원하는 제작 방식을 선택하세요.</p>
            </div>

            {/* Autopilot Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-3">
                                <span>✨ BETA</span>
                                <span>오토파일럿 모드</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">주제만 입력하면 끝!</h3>
                            <p className="text-violet-100 text-sm max-w-md mb-6">
                                AI 에이전트가 대본 작성부터 영상 생성까지 모든 과정을 자동으로 수행합니다.
                            </p>
                            <Link
                                href="/create/autopilot"
                                className="inline-flex items-center gap-2 bg-white text-violet-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors shadow-sm"
                            >
                                <span>오토파일럿 시작하기</span>
                                <span>→</span>
                            </Link>
                        </div>
                        <div className="hidden sm:block text-6xl opacity-80">
                            🤖
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-sm text-gray-500">또는 직접 상세 설정하기</span>
                </div>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">영상 비율 선택</h3>
                <div className="flex gap-4">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => setAspectRatio(ratio.value)}
                            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all
                                ${aspectRatio === ratio.value
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="text-2xl mb-2">{ratio.icon}</span>
                            <span className={`font-medium ${aspectRatio === ratio.value ? 'text-violet-700' : 'text-gray-700'}`}>
                                {ratio.label}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">{ratio.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Style Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">스타일 선택</h3>
                <div className="grid grid-cols-4 gap-4">
                    {STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group
                                ${selectedStyle === style.id
                                    ? 'border-violet-600 ring-2 ring-violet-200'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                        >
                            <img
                                src={style.thumbnail}
                                alt={style.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center text-center p-2 transition-colors ${selectedStyle === style.id ? 'bg-black/20' : ''}`}>
                                <span className="text-white font-medium text-sm drop-shadow-md">{style.name}</span>
                            </div>
                        </button>
                    ))}
                    {/* Custom Style Button */}
                    <button
                        onClick={() => setSelectedStyle('custom')}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-all
                            ${selectedStyle === 'custom'
                                ? 'border-violet-600 bg-violet-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <span className="text-xl">+</span>
                            <span className="text-xs font-medium">커스텀 스타일</span>
                        </div>
                    </button>
                </div>

                {/* Custom Style Prompt Input */}
                {selectedStyle === 'custom' && (
                    <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium text-violet-800">커스텀 스타일 프롬프트</label>
                        <textarea
                            value={customStyle}
                            onChange={(e) => setCustomStyle(e.target.value)}
                            placeholder="예: 80년대 복고풍 사이버펑크 애니메이션, 부드러운 파스텔 톤..."
                            className="w-full p-3 bg-white border border-violet-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-violet-300 min-h-[80px]"
                        />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link
                    href="/"
                    className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                    ← 대시보드로
                </Link>
                <button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-lg shadow-violet-200"
                >
                    {isSubmitting ? '생성 중...' : '다음 단계 →'}
                </button>
            </div>
        </div>
    );
}
