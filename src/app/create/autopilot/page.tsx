'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AspectRatio, RenderStrategy } from '@/types';

type PreviewSource = 'curated_sample' | 'official_thumbnail' | 'reference_placeholder' | 'none' | 'fal' | 'local';

interface ImageModelOption {
    id: string;
    label: string;
    description: string;
    previewSource?: PreviewSource;
    previewSourceLabel?: string;
    previewImageUrl?: string;
    fallbackPreviewImageUrl?: string;
    providerDisplayName?: string;
    modelDisplayName?: string;
    costModeLabel?: string;
    defaultQuality?: string;
    disabled?: boolean;
    offlineReason?: string;
    qualities: Array<{
        id: string;
        credits: number;
        modeLabel?: string;
        estimatedUsd?: number;
    }>;
}

interface VideoModelOption {
    id: string;
    label: string;
    description: string;
    previewSource?: PreviewSource;
    previewSourceLabel?: string;
    previewImageUrl?: string;
    previewVideoUrl?: string;
    fallbackPreviewImageUrl?: string;
    providerDisplayName?: string;
    modelDisplayName?: string;
    costModeLabel?: string;
    defaultDurationSeconds?: number;
    disabled?: boolean;
    offlineReason?: string;
    resolutions: Array<{
        id: string;
        creditsPerCut: number;
        estimatedUsdPerCut?: number;
    }>;
}

interface VoiceOption {
    voiceId: string;
    name: string;
    category?: string;
    previewUrl?: string;
}

interface LogMessage {
    message: string;
    timestamp: number;
}

const DEFAULT_IMAGE_MODEL_ID = 'gpt-image-2';
const DEFAULT_VIDEO_MODEL_ID = 'ltx-2.3-fast';
const DURATION_OPTIONS = [30, 45, 60, 90] as const;
const ASPECT_OPTIONS: Array<{ value: AspectRatio; label: string }> = [
    { value: '16:9', label: '16:9 가로' },
    { value: '9:16', label: '9:16 세로' },
];

const DIRECTION_TEMPLATES = [
    {
        id: 'ani_webtoon_cutscene',
        title: '웹툰 컷신',
        summary: '대사, 표정, 패널 전환, 컷 간 연결 중심',
    },
    {
        id: 'ani_cinematic_sequence',
        title: '시네마틱 시퀀스',
        summary: '카메라워크, 조명, 감정선 중심',
    },
    {
        id: 'ani_action_beat',
        title: '액션 비트',
        summary: '동작, 타이밍, 임팩트 포즈 중심',
    },
    {
        id: 'ani_character_showcase',
        title: '캐릭터 쇼케이스',
        summary: '캐릭터 일관성, 포즈, 표정 중심',
    },
    {
        id: 'ani_montage_mv',
        title: '몽타주 / MV',
        summary: '리듬, 이미지 연결, 분위기 중심',
    },
] as const;

function getPreviewImageUrl(model: { previewImageUrl?: string; fallbackPreviewImageUrl?: string }) {
    return model.previewImageUrl || model.fallbackPreviewImageUrl || '/styles/cinematic.png';
}

function getPreviewLabel(model: { previewSource?: PreviewSource; previewSourceLabel?: string }) {
    if (model.previewSourceLabel) return model.previewSourceLabel;
    if (model.previewSource === 'official_thumbnail' || model.previewSource === 'fal') return 'fal official preview';
    if (model.previewSource === 'local') return 'Local reference preview';
    return 'Reference image · not model output';
}

function formatUsd(value?: number) {
    return typeof value === 'number' ? `$${value.toFixed(value < 0.1 ? 3 : 2)}` : null;
}

export default function AutopilotPage() {
    const router = useRouter();
    const logsEndRef = useRef<HTMLDivElement>(null);

    const [projectTitle, setProjectTitle] = useState('새 애니메이션 작품');
    const [topic, setTopic] = useState('');
    const [storyGenre, setStoryGenre] = useState('어반 판타지');
    const [storyTone, setStoryTone] = useState('시네마틱 서스펜스');
    const [directionTemplate, setDirectionTemplate] = useState<(typeof DIRECTION_TEMPLATES)[number]['id']>('ani_webtoon_cutscene');
    const [storyCharacters, setStoryCharacters] = useState('');
    const [storyWorld, setStoryWorld] = useState('');
    const [storyNegativeRules, setStoryNegativeRules] = useState('깨진 손, 일그러진 얼굴, 읽을 수 없는 텍스트, 과한 고어 표현 금지');
    const [styleText, setStyleText] = useState('웹툰풍 선명한 실루엣, 일관된 캐릭터 디자인, 영화적인 조명');
    const [durationSeconds, setDurationSeconds] = useState<number>(30);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [renderStrategy, setRenderStrategy] = useState<RenderStrategy>('native');
    const [imageModelId, setImageModelId] = useState(DEFAULT_IMAGE_MODEL_ID);
    const [videoModelId, setVideoModelId] = useState(DEFAULT_VIDEO_MODEL_ID);
    const [imageQuality, setImageQuality] = useState('medium');
    const [videoResolution, setVideoResolution] = useState('1080p');
    const [imageModels, setImageModels] = useState<ImageModelOption[]>([]);
    const [videoModels, setVideoModels] = useState<VideoModelOption[]>([]);
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState('');
    const [showAdvancedModels, setShowAdvancedModels] = useState(false);
    const [comfyStatus, setComfyStatus] = useState<{ configured: boolean; online: boolean } | null>(null);
    const [estimatedTtsCredits, setEstimatedTtsCredits] = useState(0);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [imageResponse, videoResponse, voicesResponse, comfyResponse] = await Promise.all([
                fetch('/api/models/image'),
                fetch('/api/models/video'),
                fetch('/api/voices').catch(() => null),
                fetch('/api/comfyui/status').catch(() => null),
            ]);

            if (cancelled) return;

            if (imageResponse.ok) {
                const payload = await imageResponse.json();
                const nextModels: ImageModelOption[] = payload.models || [];
                setImageModels(nextModels);
                const selected = nextModels.find((model) => model.id === DEFAULT_IMAGE_MODEL_ID) || nextModels.find((model) => !model.disabled);
                if (selected) {
                    setImageModelId(selected.id);
                    setImageQuality(selected.defaultQuality || selected.qualities[0]?.id || 'medium');
                }
            }

            if (videoResponse.ok) {
                const payload = await videoResponse.json();
                const nextModels: VideoModelOption[] = payload.models || [];
                setVideoModels(nextModels);
                const selected = nextModels.find((model) => model.id === DEFAULT_VIDEO_MODEL_ID) || nextModels.find((model) => !model.disabled);
                if (selected) {
                    setVideoModelId(selected.id);
                    setVideoResolution(selected.resolutions[0]?.id || '1080p');
                }
            }

            if (voicesResponse?.ok) {
                const payload = await voicesResponse.json();
                const nextVoices: VoiceOption[] = payload.voices || [];
                setVoices(nextVoices);
                if (nextVoices[0]) setSelectedVoiceId(nextVoices[0].voiceId);
            }

            if (comfyResponse?.ok) {
                setComfyStatus(await comfyResponse.json());
            } else {
                setComfyStatus({ configured: false, online: false });
            }
        }

        void load().catch((error) => {
            if (!cancelled) setNotice(error instanceof Error ? error.message : 'Failed to load setup data');
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function estimateTts() {
            const response = await fetch('/api/credits/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'tts',
                    text: 'a'.repeat(Math.max(1, durationSeconds * 6)),
                }),
            });
            if (!response.ok || cancelled) return;
            const payload = await response.json();
            setEstimatedTtsCredits(Number(payload.quoteCredits || 0));
        }

        void estimateTts().catch(() => {
            if (!cancelled) setEstimatedTtsCredits(0);
        });

        return () => {
            cancelled = true;
        };
    }, [durationSeconds]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const selectedImageModel = imageModels.find((model) => model.id === imageModelId) || imageModels.find((model) => !model.disabled) || null;
    const selectedImageQuality = selectedImageModel?.qualities.find((quality) => quality.id === imageQuality) || selectedImageModel?.qualities[0] || null;
    const selectedVideoModel = videoModels.find((model) => model.id === videoModelId) || videoModels.find((model) => !model.disabled) || null;
    const selectedVideoResolution = selectedVideoModel?.resolutions.find((resolution) => resolution.id === videoResolution) || selectedVideoModel?.resolutions[0] || null;
    const selectedVideoDurationSeconds = selectedVideoModel?.defaultDurationSeconds || 6;
    const selectedDirectionTemplate = DIRECTION_TEMPLATES.find((template) => template.id === directionTemplate) || DIRECTION_TEMPLATES[0];

    const estimate = useMemo(() => {
        const cutCount = Math.max(1, Math.ceil(durationSeconds / selectedVideoDurationSeconds));
        const imageCredits = (selectedImageQuality?.credits || 0) * cutCount;
        const videoCredits = (selectedVideoResolution?.creditsPerCut || 0) * cutCount;
        return {
            cutCount,
            imageCredits,
            videoCredits,
            totalCredits: imageCredits + videoCredits + estimatedTtsCredits,
        };
    }, [durationSeconds, selectedImageQuality, selectedVideoDurationSeconds, selectedVideoResolution, estimatedTtsCredits]);

    const startAutopilot = async () => {
        if (!topic.trim() || !selectedImageModel || !selectedImageQuality || !selectedVideoModel || !selectedVideoResolution) {
            setNotice('작품 아이디어를 입력하고 모델 옵션 로딩이 끝날 때까지 기다려 주세요.');
            return;
        }

        setStatus('running');
        setProgress(0);
        setLogs([]);
        setNotice(null);

        try {
            const response = await fetch('/api/autopilot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: projectTitle.trim() || topic,
                    topic,
                    duration: durationSeconds,
                    persona: directionTemplate,
                    voiceId: selectedVoiceId || undefined,
                    aspectRatio,
                    renderStrategy: aspectRatio === '9:16' ? renderStrategy : 'native',
                    style: 'anime',
                    styleText: [
                        `연출 템플릿: ${selectedDirectionTemplate.title}`,
                        `템플릿 의도: ${selectedDirectionTemplate.summary}`,
                        `비주얼 규칙: ${styleText.trim() || '캐릭터와 배경의 일관성 유지'}`,
                    ].join('\n'),
                    imageModelId,
                    videoModelId,
                    imageQuality: selectedImageQuality.id,
                    videoResolution: selectedVideoResolution.id,
                    visualMode: 'style_fixed',
                    productionMode: 'animation',
                    storyBible: {
                        logline: topic,
                        genre: storyGenre,
                        tone: storyTone,
                        characters: storyCharacters,
                        world: storyWorld,
                        styleRules: styleText.trim() || undefined,
                        negativeRules: storyNegativeRules,
                        directionTemplate: selectedDirectionTemplate.title,
                        targetCutCount: estimate.cutCount,
                    },
                }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload?.error?.message || 'Failed to start autopilot');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No response stream');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                for (const eventBlock of chunk.split('\n\n')) {
                    if (!eventBlock.startsWith('event: ')) continue;
                    const [eventLine, dataLine] = eventBlock.split('\n');
                    const eventName = eventLine.replace('event: ', '');
                    const data = JSON.parse((dataLine || 'data: {}').replace('data: ', ''));
                    if (eventName === 'progress') setProgress(Number(data.progress || 0));
                    if (eventName === 'log') setLogs((prev) => [...prev, { message: data.message || '', timestamp: Date.now() }]);
                    if (eventName === 'project_created') setProjectId(data.projectId);
                    if (eventName === 'completed') {
                        setProgress(100);
                        setStatus('completed');
                    }
                    if (eventName === 'error') {
                        setStatus('error');
                        setLogs((prev) => [...prev, { message: data?.message || data?.error?.message || 'Unknown error', timestamp: Date.now() }]);
                    }
                }
            }
        } catch (error) {
            setStatus('error');
            setLogs((prev) => [...prev, { message: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }]);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div>
                <Link href="/create/new" className="text-sm text-slate-500 hover:text-slate-900">
                    수동 설정으로 돌아가기
                </Link>
            </div>

            {notice && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {notice}
                </div>
            )}

            <section className="text-center">
                <div className="mb-3 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                    Animation Production Workspace
                </div>
                <h1 data-testid="animator-lab-title" className="text-5xl font-black tracking-tight text-slate-950">
                    Animator Lab
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-slate-500">
                    아이디어를 스토리 바이블과 컷보드로 분해하고, 이미지/모션 테이크를 비교한 뒤 편집과 렌더까지 이어가는 애니메이션 제작 워크벤치입니다.
                </p>
                <div
                    data-testid="comfyui-status"
                    className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        comfyStatus?.online ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                >
                    <span className={`h-2 w-2 rounded-full ${comfyStatus?.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    Local ComfyUI: {comfyStatus?.online ? 'Online' : 'Offline'}
                </div>
            </section>

            <div className="grid gap-3 md:grid-cols-3">
                <div data-testid="story-bible-panel" className="rounded-2xl border bg-white p-4 shadow-sm">
                    <p className="font-bold text-slate-950">스토리 바이블</p>
                    <p className="mt-1 text-xs text-slate-500">로그라인, 캐릭터, 세계관, 톤, 스타일 규칙, 금지 요소를 먼저 고정합니다.</p>
                </div>
                <div data-testid="shot-board-panel" className="rounded-2xl border bg-white p-4 shadow-sm">
                    <p className="font-bold text-slate-950">컷보드</p>
                    <p className="mt-1 text-xs text-slate-500">컷마다 대사, 카메라, 액션, 조명, 감정, 예상 길이를 분리합니다.</p>
                </div>
                <div data-testid="model-lab-panel" className="rounded-2xl border bg-white p-4 shadow-sm">
                    <p className="font-bold text-slate-950">모델랩</p>
                    <p className="mt-1 text-xs text-slate-500">클라우드와 로컬 모델 결과를 take로 비교하고 최종 컷만 선택합니다.</p>
                </div>
            </div>

            {status === 'idle' ? (
                <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
                        <div className="space-y-2">
                            <label htmlFor="autopilot-title" className="text-sm font-bold text-slate-700">
                                작품 제목
                            </label>
                            <input
                                id="autopilot-title"
                                value={projectTitle}
                                onChange={(event) => setProjectTitle(event.target.value)}
                                className="w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="autopilot-topic" className="text-sm font-bold text-slate-700">
                                작품 아이디어 / 로그라인
                            </label>
                            <textarea
                                id="autopilot-topic"
                                value={topic}
                                onChange={(event) => setTopic(event.target.value)}
                                rows={4}
                                placeholder="예: 새벽 한강 다리 아래에서 배달 일을 하던 소녀가, 자기 이름이 적힌 빛나는 편지를 발견한다."
                                className="w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-slate-400"
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-xs font-semibold text-slate-600">
                                장르
                                <input value={storyGenre} onChange={(event) => setStoryGenre(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                            </label>
                            <label className="space-y-1 text-xs font-semibold text-slate-600">
                                톤
                                <input value={storyTone} onChange={(event) => setStoryTone(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                            </label>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500">연출 템플릿</p>
                            <div className="grid gap-2 md:grid-cols-2">
                                {DIRECTION_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setDirectionTemplate(template.id)}
                                        className={`rounded-xl border p-3 text-left text-sm transition ${
                                            directionTemplate === template.id
                                                ? 'border-slate-950 bg-slate-950 text-white'
                                                : 'bg-white hover:border-slate-400'
                                        }`}
                                    >
                                        <span className="block font-black">{template.title}</span>
                                        <span className={`mt-1 block text-xs ${directionTemplate === template.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {template.summary}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="block space-y-1 text-xs font-semibold text-slate-600">
                            캐릭터 메모
                            <textarea value={storyCharacters} onChange={(event) => setStoryCharacters(event.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                        </label>

                        <label className="block space-y-1 text-xs font-semibold text-slate-600">
                            세계관 / 연속성
                            <textarea value={storyWorld} onChange={(event) => setStoryWorld(event.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                        </label>

                        <label className="block space-y-1 text-xs font-semibold text-slate-600">
                            비주얼 스타일 규칙
                            <input value={styleText} onChange={(event) => setStyleText(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                        </label>

                        <label className="block space-y-1 text-xs font-semibold text-slate-600">
                            금지 요소
                            <input value={storyNegativeRules} onChange={(event) => setStoryNegativeRules(event.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm font-normal" />
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500">화면 비율</p>
                                <div className="flex gap-2">
                                    {ASPECT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setAspectRatio(option.value)}
                                            className={`rounded-lg border px-3 py-2 text-sm ${aspectRatio === option.value ? 'border-slate-950 bg-slate-950 text-white' : 'bg-white'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500">목표 러닝타임</p>
                                <div className="flex flex-wrap gap-2">
                                    {DURATION_OPTIONS.map((seconds) => (
                                        <button
                                            key={seconds}
                                            type="button"
                                            onClick={() => setDurationSeconds(seconds)}
                                            className={`rounded-lg border px-3 py-2 text-sm ${durationSeconds === seconds ? 'border-slate-950 bg-slate-950 text-white' : 'bg-white'}`}
                                        >
                                            {seconds}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {aspectRatio === '9:16' && (
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setRenderStrategy('native')} className={`rounded-lg border px-3 py-2 text-sm ${renderStrategy === 'native' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                                    네이티브 세로
                                </button>
                                <button type="button" onClick={() => setRenderStrategy('reframe_portrait')} className={`rounded-lg border px-3 py-2 text-sm ${renderStrategy === 'reframe_portrait' ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                                    가로 컷 리프레임
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            data-testid="advanced-model-toggle"
                            onClick={() => setShowAdvancedModels((value) => !value)}
                            className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            {showAdvancedModels ? '모델 고급 설정 닫기' : '모델 고급 설정 열기'}
                        </button>

                        {showAdvancedModels && (
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
                                    <p className="text-sm font-bold text-slate-900">이미지 모델</p>
                                    <div className="space-y-2">
                                        {imageModels.map((model) => (
                                            <button
                                                key={model.id}
                                                type="button"
                                                data-testid={`image-model-${model.id}`}
                                                disabled={model.disabled}
                                                onClick={() => {
                                                    if (model.disabled) return;
                                                    setImageModelId(model.id);
                                                    setImageQuality(model.defaultQuality || model.qualities[0]?.id || 'medium');
                                                }}
                                                className={`w-full rounded-xl border p-3 text-left text-sm ${model.disabled ? 'bg-slate-100 text-slate-400' : imageModelId === model.id ? 'border-slate-950 bg-white ring-2 ring-slate-200' : 'bg-white hover:border-slate-400'}`}
                                            >
                                                <div className="flex gap-3">
                                                    <img src={getPreviewImageUrl(model)} alt="" className="h-14 w-24 rounded-lg object-cover" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900">{model.modelDisplayName || model.label}</p>
                                                        <p className="text-xs text-slate-500">{model.disabled ? model.offlineReason : model.description}</p>
                                                        <p data-testid={`image-preview-source-${model.id}`} className="mt-1 text-[11px] text-amber-700">{getPreviewLabel(model)}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(selectedImageModel?.qualities || []).map((quality) => (
                                            <button
                                                key={quality.id}
                                                type="button"
                                                data-testid={`image-quality-${quality.id}`}
                                                onClick={() => setImageQuality(quality.id)}
                                                className={`rounded-lg border px-3 py-1 text-xs ${imageQuality === quality.id ? 'bg-slate-950 text-white' : 'bg-white'}`}
                                            >
                                                {quality.modeLabel || quality.id} · {quality.id} · {quality.credits}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
                                    <p className="text-sm font-bold text-slate-900">영상 모델</p>
                                    <div className="space-y-2">
                                        {videoModels.map((model) => (
                                            <button
                                                key={model.id}
                                                type="button"
                                                data-testid={`video-model-${model.id}`}
                                                disabled={model.disabled}
                                                onClick={() => {
                                                    if (model.disabled) return;
                                                    setVideoModelId(model.id);
                                                    setVideoResolution(model.resolutions[0]?.id || '1080p');
                                                }}
                                                className={`w-full rounded-xl border p-3 text-left text-sm ${model.disabled ? 'bg-slate-100 text-slate-400' : videoModelId === model.id ? 'border-slate-950 bg-white ring-2 ring-slate-200' : 'bg-white hover:border-slate-400'}`}
                                            >
                                                <div className="flex gap-3">
                                                    <img src={getPreviewImageUrl(model)} alt="" className="h-14 w-24 rounded-lg object-cover" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-slate-900">{model.modelDisplayName || model.label}</p>
                                                        <p className="text-xs text-slate-500">{model.disabled ? model.offlineReason : model.description}</p>
                                                        <p data-testid={`video-preview-source-${model.id}`} className="mt-1 text-[11px] text-amber-700">{getPreviewLabel(model)}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(selectedVideoModel?.resolutions || []).map((resolution) => (
                                            <button
                                                key={resolution.id}
                                                type="button"
                                                onClick={() => setVideoResolution(resolution.id)}
                                                className={`rounded-lg border px-3 py-1 text-xs ${videoResolution === resolution.id ? 'bg-slate-950 text-white' : 'bg-white'}`}
                                            >
                                                {resolution.id} · {resolution.creditsPerCut} {formatUsd(resolution.estimatedUsdPerCut)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Estimate</p>
                            <p className="mt-1 text-3xl font-black text-slate-950">{estimate.totalCredits.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">credits, mocked estimate</p>
                        </div>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between"><dt>예상 컷 수</dt><dd>{estimate.cutCount}</dd></div>
                            <div className="flex justify-between"><dt>이미지</dt><dd>{estimate.imageCredits}</dd></div>
                            <div className="flex justify-between"><dt>영상</dt><dd>{estimate.videoCredits}</dd></div>
                            <div className="flex justify-between"><dt>TTS</dt><dd>{estimatedTtsCredits}</dd></div>
                        </dl>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                            템플릿: {selectedDirectionTemplate.title}
                            <br />
                            Image: {selectedImageModel?.modelDisplayName || imageModelId} / {imageQuality}
                            <br />
                            Video: {selectedVideoModel?.modelDisplayName || videoModelId} / {videoResolution}
                            <br />
                            Voice: {voices.find((voice) => voice.voiceId === selectedVoiceId)?.name || 'default'}
                        </div>
                        <button
                            type="button"
                            data-testid="start-autopilot"
                            onClick={startAutopilot}
                            disabled={!topic.trim()}
                            className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            스토리 바이블과 컷보드 만들기
                        </button>
                    </aside>
                </section>
            ) : (
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Autopilot</p>
                            <h2 className="text-2xl font-black text-slate-950">{status}</h2>
                        </div>
                        <div className="text-2xl font-black text-slate-950">{progress}%</div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-slate-950 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-5 h-64 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200">
                        {logs.map((log, index) => (
                            <div key={`${log.timestamp}-${index}`}>
                                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                    <div className="mt-5 flex gap-3">
                        {projectId && (
                            <button type="button" onClick={() => router.push(`/project/${projectId}/preview`)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                                Open work
                            </button>
                        )}
                        <button type="button" onClick={() => setStatus('idle')} className="rounded-xl border px-4 py-2 text-sm font-bold">
                            Back
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
