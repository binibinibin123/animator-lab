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

    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleNext = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aspectRatio,
                    style: selectedStyle,
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
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                <span className="text-white font-medium">{style.name}</span>
                            </div>
                            {selectedStyle === style.id && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
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
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? '생성 중...' : '다음 단계 →'}
                </button>
            </div>
        </div>
    );
}
