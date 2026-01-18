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
    { id: 'anime', name: '애니메이션', thumbnail: '/styles/anime.jpg' },
    { id: 'realistic', name: '실사', thumbnail: '/styles/realistic.jpg' },
    { id: 'digital-art', name: '디지털아트', thumbnail: '/styles/digital.jpg' },
    { id: 'illustration', name: '일러스트', thumbnail: '/styles/illustration.jpg' },
    { id: 'cinematic', name: '시네마틱', thumbnail: '/styles/cinematic.jpg' },
    { id: 'cartoon', name: '카툰', thumbnail: '/styles/cartoon.jpg' },
    { id: 'watercolor', name: '수채화', thumbnail: '/styles/watercolor.jpg' },
    { id: 'minimalist', name: '미니멀', thumbnail: '/styles/minimalist.jpg' },
    { id: '3d-render', name: '3D 렌더', thumbnail: '/styles/3d.jpg' },
    { id: 'vintage', name: '빈티지', thumbnail: '/styles/vintage.jpg' },
    { id: 'neon', name: '네온', thumbnail: '/styles/neon.jpg' },
    { id: 'sketch', name: '스케치', thumbnail: '/styles/sketch.jpg' },
];

export default function SettingsPage() {
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [selectedStyle, setSelectedStyle] = useState<string>('anime');
    const [customStyle, setCustomStyle] = useState<string>('');

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
                }),
            });

            if (!response.ok) throw new Error('Failed to create project');

            const { project } = await response.json();
            router.push(`/create/script?projectId=${project.id}`);
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
                <h2 className="text-2xl font-bold text-gray-900">영상 설정</h2>
                <p className="text-gray-500 mt-1">스타일과 비율을 선택하고 시작하세요.</p>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">영상 비율 선택</h3>
                <div className="flex gap-4">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => setAspectRatio(ratio.value)}
                            className={`
                flex flex-col items-center p-4 rounded-xl border-2 transition-all
                ${aspectRatio === ratio.value
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }
              `}
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
                            className={`
                relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                ${selectedStyle === style.id
                                    ? 'border-violet-600 ring-2 ring-violet-200'
                                    : 'border-transparent hover:border-gray-300'
                                }
              `}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-center p-2">
                                <span className="text-white font-medium text-sm">{style.name}</span>
                            </div>
                        </button>
                    ))}
                    {/* Custom Style Button */}
                    <button
                        onClick={() => setSelectedStyle('custom')}
                        className={`
                            relative aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-all
                            ${selectedStyle === 'custom'
                                ? 'border-violet-600 bg-violet-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }
                        `}
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
