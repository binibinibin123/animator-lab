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
    { id: 'senior-1', name: '시니어 유튜브 1', thumbnail: '/styles/senior-1.png' },
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

type VisualMode = 'character_fixed' | 'style_fixed';

export default function NewProjectPage() {
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [visualMode, setVisualMode] = useState<VisualMode>('character_fixed');
    const [selectedStyle, setSelectedStyle] = useState<string>('anime');
    const [customStyle, setCustomStyle] = useState<string>('');
    const [styleGuide, setStyleGuide] = useState<string>('');
    const [referenceFile, setReferenceFile] = useState<File | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleNext = async () => {
        setIsSubmitting(true);

        const isCustomStyle = selectedStyle === 'custom';
        if (isCustomStyle && !customStyle.trim()) {
            alert('커스텀 스타일 프롬프트를 입력해주세요.');
            setIsSubmitting(false);
            return;
        }

        const style = isCustomStyle ? 'custom' : selectedStyle;
        const styleText = isCustomStyle ? customStyle.trim() : styleGuide.trim() || undefined;

        try {
            const response = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aspectRatio,
                    style,
                    styleText,
                    visualMode,
                    videoProvider: 'fal',
                }),
            });

            const createData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(createData?.error?.message || createData?.error || 'Failed to create project');
            }

            const project = createData.project;
            if (!project?.id) {
                throw new Error('Project ID is missing');
            }

            if (referenceFile) {
                const formData = new FormData();
                formData.append('projectId', project.id);
                formData.append('referenceType', visualMode === 'character_fixed' ? 'character' : 'style');
                formData.append('file', referenceFile);

                const uploadRes = await fetch('/api/project/reference/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadRes.json().catch(() => ({}));
                if (!uploadRes.ok) {
                    throw new Error(uploadData?.error?.message || 'Reference upload failed');
                }

                const patchPayload: Record<string, unknown> = { id: project.id };
                if (visualMode === 'character_fixed') {
                    patchPayload.characterReferenceUrl = uploadData.url;
                } else {
                    patchPayload.styleReferenceUrl = uploadData.url;
                }

                const patchRes = await fetch('/api/project', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchPayload),
                });

                if (!patchRes.ok) {
                    const patchData = await patchRes.json().catch(() => ({}));
                    throw new Error(patchData?.error?.message || 'Failed to save reference image URL');
                }
            }

            router.push(`/project/${project.id}/script`);
        } catch (error: any) {
            console.error('Error creating project:', error);
            alert(error.message || '프로젝트 생성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">새 프로젝트 만들기</h2>
                <p className="text-gray-500 mt-1">모드를 고른 뒤 상세 스타일을 설정하세요.</p>
            </div>

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
                        <div className="hidden sm:block text-6xl opacity-80">🤖</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">생성 모드 선택</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setVisualMode('character_fixed')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            visualMode === 'character_fixed'
                                ? 'border-violet-600 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <p className="font-bold text-gray-900">캐릭터 고정</p>
                        <p className="text-sm text-gray-600 mt-1">한 인물 정체성을 최대한 유지합니다.</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisualMode('style_fixed')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            visualMode === 'style_fixed'
                                ? 'border-violet-600 bg-violet-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <p className="font-bold text-gray-900">스타일 고정</p>
                        <p className="text-sm text-gray-600 mt-1">여러 인물도 가능, 그림체를 유지합니다.</p>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">영상 비율 선택</h3>
                <div className="flex gap-4">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            type="button"
                            onClick={() => setAspectRatio(ratio.value)}
                            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                                aspectRatio === ratio.value
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

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">스타일 선택</h3>
                <div className="grid grid-cols-4 gap-4">
                    {STYLES.map((styleItem) => (
                        <button
                            key={styleItem.id}
                            type="button"
                            onClick={() => setSelectedStyle(styleItem.id)}
                            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${
                                selectedStyle === styleItem.id
                                    ? 'border-violet-600 ring-2 ring-violet-200'
                                    : 'border-transparent hover:border-gray-300'
                            }`}
                        >
                            <img
                                src={styleItem.thumbnail}
                                alt={styleItem.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center text-center p-2 transition-colors ${selectedStyle === styleItem.id ? 'bg-black/20' : ''}`}>
                                <span className="text-white font-medium text-sm drop-shadow-md">{styleItem.name}</span>
                            </div>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setSelectedStyle('custom')}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-all ${
                            selectedStyle === 'custom'
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

                {selectedStyle === 'custom' ? (
                    <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-2">
                        <label htmlFor="custom-style" className="text-sm font-medium text-violet-800">
                            커스텀 스타일 프롬프트
                        </label>
                        <textarea
                            id="custom-style"
                            value={customStyle}
                            onChange={(e) => setCustomStyle(e.target.value)}
                            placeholder="예: 80년대 복고풍 사이버펑크 애니메이션, 부드러운 파스텔 톤..."
                            className="w-full p-3 bg-white border border-violet-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-violet-300 min-h-[80px]"
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <label htmlFor="style-guide" className="text-sm font-medium text-gray-700">
                            스타일 보조 가이드 (선택)
                        </label>
                        <textarea
                            id="style-guide"
                            value={styleGuide}
                            onChange={(e) => setStyleGuide(e.target.value)}
                            placeholder="예: 부드러운 라인, 따뜻한 색감, 배경은 단순하게"
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-violet-300 min-h-[80px]"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-2 p-4 bg-gray-50 border rounded-xl">
                <label htmlFor="reference-image" className="text-sm font-medium text-gray-700">
                    {visualMode === 'character_fixed' ? '캐릭터 참조 이미지 (선택)' : '스타일 참조 이미지 (선택)'}
                </label>
                <input
                    id="reference-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-600"
                />
                <p className="text-xs text-gray-500">
                    업로드하지 않아도 프로젝트 생성은 가능합니다. 다만 일관성 품질은 참조 이미지가 있을 때 더 좋아집니다.
                </p>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Link href="/projects" className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 대시보드로
                </Link>
                <button
                    type="button"
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
