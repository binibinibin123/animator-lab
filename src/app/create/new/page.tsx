'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AspectRatio, RenderStrategy } from '@/types';
import { createUploadSessionId, uploadProjectReference } from '@/lib/api/referenceUploadClient';
import { validateReferenceUploadFile } from '@/lib/api/referenceUploadConfig';

type VisualMode = 'character_fixed' | 'style_fixed';

const ASPECT_RATIOS: Array<{ value: AspectRatio; label: string; desc: string }> = [
    { value: '16:9', label: '16:9', desc: '웹/유튜브, 포트폴리오 표준' },
    { value: '9:16', label: '9:16', desc: '쇼츠, 릴스, 모바일 시연' },
    { value: '1:1', label: '1:1', desc: '소셜 클립, 썸네일 테스트' },
    { value: '3:4', label: '3:4', desc: '세로형 콘티, 캐릭터 중심' },
];

const DIRECTION_TEMPLATES = [
    {
        id: 'ani_webtoon_cutscene',
        title: '웹툰 컷신',
        summary: '대사, 표정, 패널 전환, 컷 간 연결을 우선합니다.',
    },
    {
        id: 'ani_cinematic_sequence',
        title: '시네마틱 시퀀스',
        summary: '카메라워크, 조명, 감정선, 장면 분위기를 우선합니다.',
    },
    {
        id: 'ani_action_beat',
        title: '액션 비트',
        summary: '동작, 타이밍, 임팩트 포즈, 모션 흐름을 우선합니다.',
    },
    {
        id: 'ani_character_showcase',
        title: '캐릭터 쇼케이스',
        summary: '캐릭터 일관성, 포즈, 표정, 실루엣을 우선합니다.',
    },
    {
        id: 'ani_montage_mv',
        title: '몽타주 / MV',
        summary: '리듬, 이미지 연결, 색감, 분위기 변화를 우선합니다.',
    },
] as const;

const STYLE_PRESETS = [
    { id: 'anime', name: '애니메이션', thumbnail: '/styles/anime.png' },
    { id: 'cinematic', name: '시네마틱', thumbnail: '/styles/cinematic.png' },
    { id: 'digital-art', name: '디지털 아트', thumbnail: '/styles/digital-art.png' },
    { id: 'illustration', name: '일러스트', thumbnail: '/styles/illustration.png' },
    { id: 'cartoon', name: '카툰', thumbnail: '/styles/cartoon.png' },
    { id: '3d-render', name: '3D 렌더', thumbnail: '/styles/3d-render.png' },
];

export default function NewProjectPage() {
    const router = useRouter();

    const [projectTitle, setProjectTitle] = useState('새 애니메이션 작품');
    const [logline, setLogline] = useState('');
    const [genre, setGenre] = useState('어반 판타지');
    const [tone, setTone] = useState('시네마틱 서스펜스');
    const [directionTemplate, setDirectionTemplate] = useState<(typeof DIRECTION_TEMPLATES)[number]['id']>('ani_webtoon_cutscene');
    const [characters, setCharacters] = useState('');
    const [world, setWorld] = useState('');
    const [styleRules, setStyleRules] = useState('웹툰풍 선명한 실루엣, 일관된 캐릭터 디자인, 영화적인 조명');
    const [negativeRules, setNegativeRules] = useState('깨진 손, 일그러진 얼굴, 읽을 수 없는 텍스트, 과한 고어 표현 금지');
    const [duration, setDuration] = useState(30);
    const [targetCutCount, setTargetCutCount] = useState(6);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [renderStrategy, setRenderStrategy] = useState<RenderStrategy>('native');
    const [visualMode, setVisualMode] = useState<VisualMode>('character_fixed');
    const [selectedStyle, setSelectedStyle] = useState('anime');
    const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
    const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
    const [referenceError, setReferenceError] = useState<string | null>(null);
    const [isUploadingReference, setIsUploadingReference] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadSessionId] = useState(() => createUploadSessionId());

    const selectedTemplate = DIRECTION_TEMPLATES.find((template) => template.id === directionTemplate) || DIRECTION_TEMPLATES[0];

    const handleReferenceFileChange = async (file: File | null) => {
        if (!file) {
            setReferencePreviewUrl(null);
            setReferenceFileName(null);
            setReferenceError(null);
            return;
        }

        const validationError = validateReferenceUploadFile(file);
        if (validationError) {
            setReferenceError(validationError);
            return;
        }

        setIsUploadingReference(true);
        setReferenceError(null);

        try {
            const uploaded = await uploadProjectReference({
                file,
                referenceType: visualMode === 'character_fixed' ? 'character' : 'style',
                uploadSessionId,
            });

            setReferencePreviewUrl(uploaded.url);
            setReferenceFileName(file.name);
        } catch (error: any) {
            console.error('Reference upload error:', error);
            setReferencePreviewUrl(null);
            setReferenceFileName(null);
            setReferenceError(error?.message || '참조 이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploadingReference(false);
        }
    };

    const handleCreate = async () => {
        if (isUploadingReference) {
            alert('참조 이미지 업로드가 끝난 뒤 다시 시도해 주세요.');
            return;
        }

        const trimmedLogline = logline.trim();
        if (!trimmedLogline) {
            alert('작품 아이디어 또는 로그라인을 입력해 주세요.');
            return;
        }

        setIsSubmitting(true);

        const styleText = [
            `연출 템플릿: ${selectedTemplate.title}`,
            `템플릿 의도: ${selectedTemplate.summary}`,
            `비주얼 규칙: ${styleRules.trim() || '캐릭터와 배경의 일관성 유지'}`,
            `목표 컷 수: ${targetCutCount}`,
        ].join('\n');

        const payload: Record<string, unknown> = {
            title: projectTitle.trim() || trimmedLogline,
            topic: trimmedLogline,
            duration,
            aspectRatio,
            renderStrategy: aspectRatio === '9:16' ? renderStrategy : 'native',
            style: selectedStyle,
            styleText,
            visualMode,
            videoProvider: 'fal',
            productionMode: 'animation',
            storyBible: {
                logline: trimmedLogline,
                genre,
                tone,
                characters,
                world,
                styleRules,
                negativeRules,
                directionTemplate: selectedTemplate.title,
                targetCutCount,
                referenceImageUrl: referencePreviewUrl || undefined,
            },
        };

        if (referencePreviewUrl) {
            if (visualMode === 'character_fixed') {
                payload.characterReferenceUrl = referencePreviewUrl;
            } else {
                payload.styleReferenceUrl = referencePreviewUrl;
            }
        }

        try {
            const response = await fetch('/api/project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const createData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(createData?.error?.message || createData?.error || '작품 생성에 실패했습니다.');
            }

            const project = createData.project;
            if (!project?.id) {
                throw new Error('생성된 작품 ID를 찾을 수 없습니다.');
            }

            if (createData?.schemaMode === 'legacy') {
                window.localStorage.setItem('animatorLabSchemaMode', 'legacy');
            } else {
                window.localStorage.removeItem('animatorLabSchemaMode');
            }

            router.push(`/project/${project.id}/script`);
        } catch (error: any) {
            console.error('Error creating project:', error);
            alert(error.message || '작품 생성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Animator Lab Setup</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight">새 애니메이션 작품 만들기</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                            대본부터 쓰는 방식이 아니라, 작품 아이디어를 스토리 바이블과 컷보드로 분해하는 제작 흐름입니다.
                            캐릭터, 세계관, 연출 템플릿, 비주얼 규칙을 먼저 고정한 뒤 컷 단위 생성으로 넘어갑니다.
                        </p>
                    </div>
                    <Link
                        href="/create/autopilot"
                        className="inline-flex w-fit rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-100"
                    >
                        자동 컷보드로 시작
                    </Link>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="project-title" className="text-sm font-bold text-slate-700">작품 제목</label>
                        <input
                            id="project-title"
                            type="text"
                            value={projectTitle}
                            onChange={(event) => setProjectTitle(event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="logline" className="text-sm font-bold text-slate-700">작품 아이디어 / 로그라인</label>
                        <textarea
                            id="logline"
                            value={logline}
                            onChange={(event) => setLogline(event.target.value)}
                            rows={5}
                            placeholder="예: 새벽 한강 다리 아래에서 배달 일을 하던 소녀가, 자기 이름이 적힌 빛나는 편지를 발견한다."
                            className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 focus:border-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            장르
                            <input value={genre} onChange={(event) => setGenre(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal" />
                        </label>
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            톤
                            <input value={tone} onChange={(event) => setTone(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal" />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold text-slate-700">연출 템플릿</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {DIRECTION_TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => setDirectionTemplate(template.id)}
                                    className={`rounded-2xl border p-4 text-left transition ${
                                        directionTemplate === template.id
                                            ? 'border-slate-950 bg-slate-950 text-white'
                                            : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                                    }`}
                                >
                                    <span className="block font-black">{template.title}</span>
                                    <span className={`mt-2 block text-xs leading-5 ${directionTemplate === template.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {template.summary}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            캐릭터 메모
                            <textarea value={characters} onChange={(event) => setCharacters(event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal leading-6" />
                        </label>
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            세계관 / 배경
                            <textarea value={world} onChange={(event) => setWorld(event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal leading-6" />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            비주얼 스타일 규칙
                            <textarea value={styleRules} onChange={(event) => setStyleRules(event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal leading-6" />
                        </label>
                        <label className="space-y-2 text-sm font-bold text-slate-700">
                            금지 요소
                            <textarea value={negativeRules} onChange={(event) => setNegativeRules(event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal leading-6" />
                        </label>
                    </div>
                </div>

                <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Production Defaults</p>
                        <p className="mt-2 text-sm font-bold text-slate-950">GPT Image 2 + LTX-2.3 Fast</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">모델 세부 선택은 이미지/모션 단계에서 바꿀 수 있습니다.</p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">제작 기준</p>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs font-semibold text-slate-500">
                                러닝타임
                                <input type="number" min={10} max={180} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900" />
                            </label>
                            <label className="text-xs font-semibold text-slate-500">
                                목표 컷 수
                                <input type="number" min={1} max={60} value={targetCutCount} onChange={(event) => setTargetCutCount(Number(event.target.value))} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-900" />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">화면 비율</p>
                        <div className="grid gap-2">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button
                                    key={ratio.value}
                                    type="button"
                                    onClick={() => {
                                        setAspectRatio(ratio.value);
                                        if (ratio.value !== '9:16') setRenderStrategy('native');
                                    }}
                                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                                        aspectRatio === ratio.value ? 'border-slate-950 bg-white ring-2 ring-slate-200' : 'bg-white hover:border-slate-400'
                                    }`}
                                >
                                    <span className="font-black">{ratio.label}</span>
                                    <span className="ml-2 text-xs text-slate-500">{ratio.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {aspectRatio === '9:16' && (
                        <div className="grid gap-2">
                            <button type="button" onClick={() => setRenderStrategy('native')} className={`rounded-xl border px-3 py-2 text-sm ${renderStrategy === 'native' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                                네이티브 세로 제작
                            </button>
                            <button type="button" onClick={() => setRenderStrategy('reframe_portrait')} className={`rounded-xl border px-3 py-2 text-sm ${renderStrategy === 'reframe_portrait' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                                가로 컷을 세로로 리프레임
                            </button>
                        </div>
                    )}
                </aside>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-900">참조 기준</p>
                        <p className="mt-1 text-xs text-slate-500">캐릭터 고정 또는 스타일 고정 중 하나를 선택하고, 필요하면 참조 이미지를 올립니다.</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setVisualMode('character_fixed')} className={`rounded-xl border px-4 py-2 text-sm font-bold ${visualMode === 'character_fixed' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                            캐릭터 고정
                        </button>
                        <button type="button" onClick={() => setVisualMode('style_fixed')} className={`rounded-xl border px-4 py-2 text-sm font-bold ${visualMode === 'style_fixed' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                            스타일 고정
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="space-y-2">
                        <label htmlFor="reference-image" className="text-xs font-bold text-slate-600">참조 이미지</label>
                        <input
                            id="reference-image"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                                void handleReferenceFileChange(event.target.files?.[0] || null);
                            }}
                            disabled={isUploadingReference || isSubmitting}
                            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                        />
                        {isUploadingReference && <p className="text-xs text-slate-500">참조 이미지를 업로드하고 있습니다.</p>}
                        {referenceError && <p className="text-xs text-red-600">{referenceError}</p>}
                        {referencePreviewUrl && (
                            <div className="rounded-2xl border bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="truncate text-xs text-slate-500">{referenceFileName || referencePreviewUrl}</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReferencePreviewUrl(null);
                                            setReferenceFileName(null);
                                            setReferenceError(null);
                                        }}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-900"
                                    >
                                        제거
                                    </button>
                                </div>
                                <img src={referencePreviewUrl} alt="참조 이미지 미리보기" className="max-h-56 w-full rounded-xl object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">기본 화풍</p>
                        <div className="grid grid-cols-2 gap-2">
                            {STYLE_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setSelectedStyle(preset.id)}
                                    className={`overflow-hidden rounded-2xl border text-left ${selectedStyle === preset.id ? 'border-slate-950 ring-2 ring-slate-200' : 'border-slate-200'}`}
                                >
                                    <img src={preset.thumbnail} alt="" className="h-20 w-full object-cover" />
                                    <span className="block px-3 py-2 text-xs font-bold text-slate-700">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/projects" className="px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                    작품 목록으로
                </Link>
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isSubmitting || isUploadingReference}
                    className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? '작품 생성 중...' : '스토리 바이블 만들기'}
                </button>
            </div>
        </div>
    );
}
