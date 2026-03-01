'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUploadSessionId, uploadProjectReference } from '@/lib/api/referenceUploadClient';
import { getReferenceUploadMaxMb, validateReferenceUploadFile } from '@/lib/api/referenceUploadConfig';
import type { AspectRatio, RenderStrategy } from '@/types';

interface LogMessage {
    message: string;
    timestamp: number;
}

interface ImageModelOption {
    id: string;
    label: string;
    description: string;
    previewSource?: 'fal' | 'local' | 'none';
    previewImageUrl?: string;
    fallbackPreviewImageUrl?: string;
    qualities: Array<{
        id: string;
        credits: number;
    }>;
}

interface VideoModelOption {
    id: string;
    label: string;
    description: string;
    previewSource?: 'fal' | 'local' | 'none';
    previewImageUrl?: string;
    previewVideoUrl?: string;
    fallbackPreviewImageUrl?: string;
    resolutions: Array<{
        id: string;
        creditsPerCut: number;
    }>;
}

interface VoiceOption {
    voiceId: string;
    name: string;
    category?: string;
    previewUrl?: string;
}

interface ScriptToneOption {
    id: string;
    name: string;
    desc: string;
}

interface HoverPreviewState {
    modelId: string;
    left: number;
    top: number;
}

type VisualMode = 'character_fixed' | 'style_fixed';

const STYLE_OPTIONS = [
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

const DEFAULT_IMAGE_MODEL_ID = 'nano-banana-2';
const DEFAULT_VIDEO_MODEL_ID = 'ltx-2-fast';

const ORIENTATION_OPTIONS: { value: AspectRatio; label: string; desc: string }[] = [
    { value: '16:9', label: '가로 (16:9)', desc: '유튜브 기본 가로형' },
    { value: '9:16', label: '세로 (9:16)', desc: '쇼츠/릴스 기본형' },
];

const DURATION_OPTIONS = [30, 45, 60, 90] as const;

const SCRIPT_TONE_OPTIONS: ScriptToneOption[] = [
    {
        id: 'ko_trust_briefing',
        name: '신뢰 브리핑형',
        desc: '과장 없이 핵심 사실과 근거를 먼저 전달하는 뉴스/브리핑 톤',
    },
    {
        id: 'ko_empathy_story',
        name: '공감 스토리형',
        desc: '시청자 상황에 공감하고 사례 중심으로 풀어내는 따뜻한 톤',
    },
    {
        id: 'ko_practical_coach',
        name: '실전 코치형',
        desc: '바로 실행 가능한 체크리스트/행동 팁 중심의 코칭 톤',
    },
    {
        id: 'ko_trend_analyst',
        name: '트렌드 해설형',
        desc: '왜 지금 중요한지 맥락과 흐름을 분석해 주는 인사이트 톤',
    },
    {
        id: 'ko_light_variety',
        name: '가벼운 예능형',
        desc: '밝고 경쾌하지만 과도한 낚시 없이 전달하는 캐주얼 톤',
    },
];

const HOVER_PREVIEW_WIDTH = 288;
const HOVER_PREVIEW_HEIGHT = 162;

export default function AutopilotPage() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [visualMode, setVisualMode] = useState<VisualMode>('style_fixed');
    const [style, setStyle] = useState('anime');
    const [styleText, setStyleText] = useState('');
    const [scriptTone, setScriptTone] = useState<string>(SCRIPT_TONE_OPTIONS[0].id);
    const [durationSeconds, setDurationSeconds] = useState<number>(30);
    const [voices, setVoices] = useState<VoiceOption[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [playingVoicePreviewId, setPlayingVoicePreviewId] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [renderStrategy, setRenderStrategy] = useState<RenderStrategy>('native');
    const [imageModelId, setImageModelId] = useState(DEFAULT_IMAGE_MODEL_ID);
    const [videoModelId, setVideoModelId] = useState(DEFAULT_VIDEO_MODEL_ID);
    const [imageQuality, setImageQuality] = useState('2K');
    const [videoResolution, setVideoResolution] = useState('1080p');
    const [showAdvancedModels, setShowAdvancedModels] = useState(false);
    const [imageModels, setImageModels] = useState<ImageModelOption[]>([]);
    const [videoModels, setVideoModels] = useState<VideoModelOption[]>([]);
    const [failedVideoPreviewIds, setFailedVideoPreviewIds] = useState<Record<string, true>>({});
    const [readyVideoPreviewIds, setReadyVideoPreviewIds] = useState<Record<string, true>>({});
    const [hoverPreview, setHoverPreview] = useState<HoverPreviewState | null>(null);
    const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
    const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
    const [referenceError, setReferenceError] = useState<string | null>(null);
    const [isUploadingReference, setIsUploadingReference] = useState(false);
    const [isReferenceDragOver, setIsReferenceDragOver] = useState(false);
    const [uploadSessionId] = useState(() => createUploadSessionId());

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'warn' | 'error'; message: string } | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadModelOptions = async () => {
            try {
                const [imageResponse, videoResponse] = await Promise.all([
                    fetch('/api/models/image'),
                    fetch('/api/models/video'),
                ]);

                if (!imageResponse.ok || !videoResponse.ok) {
                    throw new Error('모델 정보를 불러오지 못했습니다.');
                }

                const imagePayload = await imageResponse.json();
                const videoPayload = await videoResponse.json();

                if (cancelled) {
                    return;
                }

                const nextImageModels: ImageModelOption[] = imagePayload?.models || [];
                const nextVideoModels: VideoModelOption[] = videoPayload?.models || [];
                setImageModels(nextImageModels);
                setVideoModels(nextVideoModels);

                if (nextImageModels.length > 0) {
                    setImageModelId((prevId) => {
                        const currentImageModel = nextImageModels.find((model) => model.id === prevId) || nextImageModels[0];
                        setImageQuality((prevQuality) => {
                            const currentQuality = currentImageModel.qualities.find((quality) => quality.id === prevQuality) || currentImageModel.qualities[0];
                            return currentQuality ? currentQuality.id : prevQuality;
                        });
                        return currentImageModel.id;
                    });
                }

                if (nextVideoModels.length > 0) {
                    setVideoModelId((prevId) => {
                        const currentVideoModel = nextVideoModels.find((model) => model.id === prevId) || nextVideoModels[0];
                        setVideoResolution((prevResolution) => {
                            const currentResolution = currentVideoModel.resolutions.find((resolution) => resolution.id === prevResolution) || currentVideoModel.resolutions[0];
                            return currentResolution ? currentResolution.id : prevResolution;
                        });
                        return currentVideoModel.id;
                    });
                }
            } catch (error: any) {
                if (!cancelled) {
                    setNotice({ type: 'warn', message: error?.message || '모델 설정을 불러오지 못했습니다.' });
                }
            }
        };

        void loadModelOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadVoices = async () => {
            setIsLoadingVoices(true);
            try {
                const response = await fetch('/api/voices');
                if (!response.ok) {
                    throw new Error('보이스 목록을 불러오지 못했습니다.');
                }

                const payload = await response.json();
                if (cancelled) {
                    return;
                }

                const nextVoices: VoiceOption[] = payload?.voices || [];
                setVoices(nextVoices);

                if (nextVoices.length > 0) {
                    setSelectedVoiceId((prev) => {
                        if (prev && nextVoices.some((voice) => voice.voiceId === prev)) {
                            return prev;
                        }
                        return nextVoices[0].voiceId;
                    });
                }
            } catch (error: any) {
                if (!cancelled) {
                    setNotice({ type: 'warn', message: error?.message || '보이스 목록을 불러오지 못했습니다.' });
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingVoices(false);
                }
            }
        };

        void loadVoices();

        return () => {
            cancelled = true;
        };
    }, []);

    const selectedImageModel = imageModels.find((model) => model.id === imageModelId) || imageModels[0] || null;
    const selectedImageQuality = selectedImageModel?.qualities.find((quality) => quality.id === imageQuality) || selectedImageModel?.qualities[0] || null;
    const selectedVideoModel = videoModels.find((model) => model.id === videoModelId) || videoModels[0] || null;
    const selectedVideoResolution = selectedVideoModel?.resolutions.find((resolution) => resolution.id === videoResolution) || selectedVideoModel?.resolutions[0] || null;
    const hoveredVideoModel = hoverPreview
        ? videoModels.find((model) => model.id === hoverPreview.modelId) || null
        : null;
    const selectedVoice = voices.find((voice) => voice.voiceId === selectedVoiceId) || null;

    const getPreviewImageUrl = (model: { previewImageUrl?: string; fallbackPreviewImageUrl?: string } | null | undefined) => {
        return model?.previewImageUrl || model?.fallbackPreviewImageUrl || '/styles/minimalist.png';
    };

    const markVideoPreviewFailed = (modelId: string) => {
        setFailedVideoPreviewIds((prev) => {
            if (prev[modelId]) {
                return prev;
            }

            return {
                ...prev,
                [modelId]: true,
            };
        });
    };

    const markVideoPreviewReady = (modelId: string) => {
        setReadyVideoPreviewIds((prev) => {
            if (prev[modelId]) {
                return prev;
            }

            return {
                ...prev,
                [modelId]: true,
            };
        });
    };

    const clearHoverHideTimer = () => {
        if (hoverHideTimerRef.current) {
            clearTimeout(hoverHideTimerRef.current);
            hoverHideTimerRef.current = null;
        }
    };

    const scheduleHideHoverPreview = () => {
        clearHoverHideTimer();
        hoverHideTimerRef.current = setTimeout(() => {
            setHoverPreview(null);
        }, 120);
    };

    const showHoverPreviewForCard = (modelId: string, cardEl: HTMLButtonElement) => {
        clearHoverHideTimer();

        const anchor = cardEl.querySelector('[data-video-preview-anchor="true"]') as HTMLElement | null;
        const rect = (anchor || cardEl).getBoundingClientRect();

        let left = rect.right + 16;
        if (left + HOVER_PREVIEW_WIDTH > window.innerWidth - 16) {
            left = rect.left - HOVER_PREVIEW_WIDTH - 16;
        }
        if (left < 16) {
            left = Math.max(16, Math.round((window.innerWidth - HOVER_PREVIEW_WIDTH) / 2));
        }

        const centeredTop = rect.top + (rect.height / 2) - (HOVER_PREVIEW_HEIGHT / 2);
        const top = Math.max(16, Math.min(centeredTop, window.innerHeight - HOVER_PREVIEW_HEIGHT - 16));

        setHoverPreview({
            modelId,
            left,
            top,
        });
    };

    const toggleVoicePreview = (voice: VoiceOption | null) => {
        if (!voice?.previewUrl) {
            return;
        }

        if (playingVoicePreviewId === voice.voiceId) {
            voicePreviewAudioRef.current?.pause();
            setPlayingVoicePreviewId(null);
            return;
        }

        if (voicePreviewAudioRef.current) {
            voicePreviewAudioRef.current.pause();
            voicePreviewAudioRef.current = null;
        }

        const audio = new Audio(voice.previewUrl);
        audio.volume = 0.55;
        audio.onended = () => setPlayingVoicePreviewId(null);
        audio.onpause = () => {
            setPlayingVoicePreviewId((prev) => (prev === voice.voiceId ? null : prev));
        };

        voicePreviewAudioRef.current = audio;
        audio.play().then(() => {
            setPlayingVoicePreviewId(voice.voiceId);
        }).catch(() => {
            setPlayingVoicePreviewId(null);
            setNotice({ type: 'warn', message: '보이스 미리듣기를 재생하지 못했습니다.' });
        });
    };

    useEffect(() => {
        return () => {
            if (hoverHideTimerRef.current) {
                clearTimeout(hoverHideTimerRef.current);
                hoverHideTimerRef.current = null;
            }

            if (voicePreviewAudioRef.current) {
                voicePreviewAudioRef.current.pause();
                voicePreviewAudioRef.current = null;
            }
        };
    }, []);

    const handleVisualModeChange = (nextMode: VisualMode) => {
        if (nextMode === visualMode) {
            return;
        }

        setVisualMode(nextMode);
        setReferencePreviewUrl(null);
        setReferenceFileName(null);
        setReferenceError(null);
    };

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

    const triggerReferencePicker = () => {
        if (isRunning || isUploadingReference) {
            return;
        }
        referenceInputRef.current?.click();
    };

    const handleReferenceDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        setIsReferenceDragOver(false);

        if (isRunning || isUploadingReference) {
            return;
        }

        const file = event.dataTransfer.files?.[0] || null;
        void handleReferenceFileChange(file);
    };

    const startAutopilot = async () => {
        if (!topic.trim()) {
            setNotice({ type: 'warn', message: '주제를 먼저 입력해 주세요.' });
            return;
        }

        if (isUploadingReference) {
            setNotice({ type: 'warn', message: '참조 이미지 업로드가 완료된 뒤 다시 시도해 주세요.' });
            return;
        }

        if (!selectedImageQuality || !selectedVideoResolution) {
            setNotice({ type: 'warn', message: '모델 옵션을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.' });
            return;
        }

        setNotice({
            type: 'info',
            message:
                visualMode === 'character_fixed'
                    ? '캐릭터 고정 모드로 오토파일럿을 시작합니다. 참조를 업로드하지 않으면 일관성은 best-effort로 처리됩니다.'
                    : '스타일 고정 모드로 오토파일럿을 시작합니다. 참조 이미지는 선택사항입니다.',
        });

        setIsRunning(true);
        setStatus('running');
        setProgress(0);
        setLogs([]);

        const controller = new AbortController();
        streamAbortRef.current = controller;

        try {
            const response = await fetch('/api/autopilot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    duration: durationSeconds,
                    persona: scriptTone,
                    voiceId: selectedVoiceId || undefined,
                    aspectRatio,
                    renderStrategy: aspectRatio === '9:16' ? renderStrategy : 'native',
                    style,
                    styleText: styleText.trim() || undefined,
                    imageModelId,
                    videoModelId,
                    imageQuality: selectedImageQuality.id,
                    videoResolution: selectedVideoResolution.id,
                    visualMode,
                    characterReferenceUrl: visualMode === 'character_fixed' ? referencePreviewUrl || undefined : undefined,
                    styleReferenceUrl: visualMode === 'style_fixed' ? referencePreviewUrl || undefined : undefined,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error?.message || 'Failed to start autopilot');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (!line.startsWith('event: ')) continue;

                    const eventName = line.split('\n')[0].replace('event: ', '');
                    const dataStr = line.split('\n')[1]?.replace('data: ', '');
                    if (!dataStr) continue;

                    try {
                        const data = JSON.parse(dataStr);

                        if (eventName === 'log') {
                            setLogs((prev) => [...prev, { message: data.message, timestamp: Date.now() }]);
                        } else if (eventName === 'progress') {
                            setProgress(data.progress);
                        } else if (eventName === 'project_created') {
                            setProjectId(data.projectId);
                        } else if (eventName === 'completed') {
                            setStatus('completed');
                            setProgress(100);
                        } else if (eventName === 'error') {
                            setStatus('error');
                            const message = data?.error?.message || data?.message || 'Unknown error';
                            setLogs((prev) => [...prev, { message: `❌ Error: ${message}`, timestamp: Date.now() }]);
                        }
                    } catch (parseError) {
                        console.error('Failed to parse SSE data', parseError);
                    }
                }
            }
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                setStatus('idle');
                setNotice({ type: 'info', message: '오토파일럿 작업을 중단했습니다.' });
                setLogs((prev) => [...prev, { message: '⏹️ 사용자 요청으로 작업이 중단되었습니다.', timestamp: Date.now() }]);
                return;
            }

            console.error('Autopilot error:', error);
            setStatus('error');
            setLogs((prev) => [...prev, { message: `❌ System Error: ${error.message}`, timestamp: Date.now() }]);
            setNotice({ type: 'error', message: '오토파일럿 실행 중 오류가 발생했습니다.' });
        } finally {
            setIsRunning(false);
            streamAbortRef.current = null;
        }
    };

    const stopAutopilot = () => {
        streamAbortRef.current?.abort();
        streamAbortRef.current = null;
        setIsRunning(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <Link href="/create/new" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                    ← 일반 모드로 돌아가기
                </Link>
            </div>

            {notice && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : notice.type === 'warn'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : notice.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                    {notice.message}
                </div>
            )}

            <div className="text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold mb-2">✨ Auto Mode</div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                    AutoVideo 오토파일럿
                </h1>
                <p className="text-gray-500">주제만 입력하면 대본부터 영상까지 한 번에 생성합니다.</p>
            </div>

            {status === 'idle' && (
                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">생성 모드</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleVisualModeChange('character_fixed')}
                                className={`px-4 py-3 rounded-xl border-2 text-left ${visualMode === 'character_fixed'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">캐릭터 고정</p>
                                <p className="text-xs text-gray-500 mt-1">참조가 없으면 best-effort</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleVisualModeChange('style_fixed')}
                                className={`px-4 py-3 rounded-xl border-2 text-left ${visualMode === 'style_fixed'
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">스타일 고정</p>
                                <p className="text-xs text-gray-500 mt-1">그림체를 우선 유지</p>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">출력 비율</p>
                        <div className="grid grid-cols-2 gap-3">
                            {ORIENTATION_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setAspectRatio(option.value);
                                        if (option.value !== '9:16') {
                                            setRenderStrategy('native');
                                        }
                                    }}
                                    className={`px-4 py-3 rounded-xl border-2 text-left ${aspectRatio === option.value
                                        ? 'border-violet-600 bg-violet-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <p className="font-semibold text-gray-900">{option.label}</p>
                                    <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 border rounded-xl bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700">영상 길이</p>
                        <div className="flex flex-wrap gap-2">
                            {DURATION_OPTIONS.map((seconds) => (
                                <button
                                    key={seconds}
                                    type="button"
                                    onClick={() => setDurationSeconds(seconds)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                                        durationSeconds === seconds
                                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {seconds}초
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">선택한 길이에 맞춰 대본 분량과 컷 수를 자동 조정합니다.</p>
                    </div>

                    <div className="space-y-3 border rounded-xl bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700">대본 톤 (한국 정서)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SCRIPT_TONE_OPTIONS.map((tone) => (
                                <button
                                    key={tone.id}
                                    type="button"
                                    onClick={() => setScriptTone(tone.id)}
                                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                                        scriptTone === tone.id
                                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <p className="text-sm font-medium">{tone.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{tone.desc}</p>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">과도한 공포/낚시 대신 신뢰·공감·실용성을 중심으로 구성합니다.</p>
                    </div>

                    <div className="space-y-2 border rounded-xl bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700">TTS 보이스</p>
                        <select
                            value={selectedVoiceId}
                            onChange={(event) => setSelectedVoiceId(event.target.value)}
                            disabled={isLoadingVoices || voices.length === 0}
                            className="w-full px-3 py-2 border rounded-lg bg-white text-sm disabled:opacity-60"
                        >
                            {voices.map((voice) => (
                                <option key={voice.voiceId} value={voice.voiceId}>
                                    {voice.name}{voice.category ? ` · ${voice.category}` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500 truncate">
                                {selectedVoice?.name
                                    ? `선택됨: ${selectedVoice.name}`
                                    : '보이스를 선택해 주세요.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => toggleVoicePreview(selectedVoice)}
                                disabled={!selectedVoice?.previewUrl || isLoadingVoices}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    !selectedVoice?.previewUrl || isLoadingVoices
                                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : playingVoicePreviewId === selectedVoice.voiceId
                                            ? 'border-violet-600 bg-violet-600 text-white'
                                            : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                                }`}
                            >
                                {playingVoicePreviewId === selectedVoice?.voiceId ? '■ 미리듣기 정지' : '▶ 미리듣기'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            {isLoadingVoices
                                ? '보이스 목록을 불러오는 중입니다...'
                                : voices.length > 0
                                    ? '선택한 보이스로 오토파일럿 TTS를 생성합니다.'
                                    : '사용 가능한 보이스가 없어 기본 보이스로 시도합니다.'}
                        </p>
                    </div>

                    {aspectRatio === '9:16' && (
                        <div className="space-y-2 border rounded-xl bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700">세로 렌더 방식</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRenderStrategy('native')}
                                    className={`p-3 rounded-lg border text-left text-sm ${
                                        renderStrategy === 'native'
                                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                                            : 'border-gray-200 bg-white text-gray-700'
                                    }`}
                                >
                                    <p className="font-medium">네이티브 세로</p>
                                    <p className="text-xs mt-1 text-gray-500">세로 프레임 중심으로 구성</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRenderStrategy('reframe_portrait')}
                                    className={`p-3 rounded-lg border text-left text-sm ${
                                        renderStrategy === 'reframe_portrait'
                                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                                            : 'border-gray-200 bg-white text-gray-700'
                                    }`}
                                >
                                    <p className="font-medium">가로→세로 보정</p>
                                    <p className="text-xs mt-1 text-gray-500">가로 구도를 세로 쇼츠로 재프레이밍</p>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">레퍼런스 이미지 업로드</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {visualMode === 'character_fixed' ? '캐릭터 외형 고정용 참조' : '그림체 고정용 참조'}
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                                {visualMode === 'character_fixed' ? '캐릭터 모드' : '스타일 모드'}
                            </span>
                        </div>

                        <input
                            ref={referenceInputRef}
                            id="autopilot-reference-image"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => {
                                void handleReferenceFileChange(e.target.files?.[0] || null);
                            }}
                            className="hidden"
                            disabled={isUploadingReference || isRunning}
                        />

                        <button
                            type="button"
                            onClick={triggerReferencePicker}
                            disabled={isUploadingReference || isRunning}
                            onDragOver={(event) => {
                                event.preventDefault();
                                if (!isRunning && !isUploadingReference) {
                                    setIsReferenceDragOver(true);
                                }
                            }}
                            onDragLeave={() => setIsReferenceDragOver(false)}
                            onDrop={handleReferenceDrop}
                            className={`rounded-xl border-2 border-dashed bg-white p-4 transition-colors ${
                                isReferenceDragOver
                                    ? 'border-violet-400 bg-violet-50'
                                    : 'border-gray-300'
                            } ${isRunning || isUploadingReference ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} w-full text-left`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-700">이미지를 드래그해서 놓거나 파일을 선택하세요.</p>
                                    <p className="text-xs text-gray-500 mt-1">PNG/JPG/WEBP, 최대 {getReferenceUploadMaxMb()}MB</p>
                                </div>
                                <span
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium"
                                >
                                    파일 선택
                                </span>
                            </div>
                        </button>

                        {isUploadingReference && (
                            <p className="text-xs text-violet-600">참조 이미지를 업로드하고 있습니다...</p>
                        )}

                        {referenceError && (
                            <p className="text-xs text-red-600">{referenceError}</p>
                        )}

                        {referencePreviewUrl && (
                            <div className="rounded-lg border bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-gray-600 truncate">
                                        업로드됨: {referenceFileName || referencePreviewUrl}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setReferencePreviewUrl(null);
                                            setReferenceFileName(null);
                                            setReferenceError(null);
                                            if (referenceInputRef.current) {
                                                referenceInputRef.current.value = '';
                                            }
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        제거
                                    </button>
                                </div>
                                <img src={referencePreviewUrl} alt="참조 이미지 미리보기" className="w-full max-h-56 object-contain rounded-md bg-gray-50" />
                            </div>
                        )}

                        <p className="text-xs text-gray-500">
                            업로드하지 않아도 오토파일럿 시작은 가능합니다. 다만 고정 모드 일관성은 참조 이미지가 있을 때 더 좋아집니다.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">그림체 선택</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {STYLE_OPTIONS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStyle(item.id)}
                                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${
                                        style === item.id
                                            ? 'border-violet-600 ring-2 ring-violet-200'
                                            : 'border-transparent hover:border-gray-300'
                                    }`}
                                >
                                    <img
                                        src={item.thumbnail}
                                        alt={item.name}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className={`absolute inset-0 bg-black/45 flex items-center justify-center text-center p-2 transition-colors ${style === item.id ? 'bg-black/25' : ''}`}>
                                        <span className="text-white font-medium text-xs drop-shadow-md">{item.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="autopilot-style-text" className="text-sm font-medium text-gray-700">스타일 가이드 (선택)</label>
                        <input
                            id="autopilot-style-text"
                            value={styleText}
                            onChange={(e) => setStyleText(e.target.value)}
                            placeholder="예: 따뜻한 톤, 부드러운 라인"
                            className="w-full px-3 py-2 border rounded-xl"
                        />
                    </div>

                    <div className="space-y-2 border rounded-xl bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-gray-800">고급 설정 (오토파일럿 전용)</p>
                                <p className="text-xs text-gray-500">일반 생성에서는 이미지 단계/영상 단계에서 각각 모델을 선택합니다.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAdvancedModels((prev) => !prev)}
                                className="px-3 py-1.5 text-xs font-medium border rounded-lg bg-white hover:bg-gray-100"
                            >
                                {showAdvancedModels ? '고급 설정 닫기' : '고급 설정 열기'}
                            </button>
                        </div>

                        {showAdvancedModels && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-3 p-3.5 border rounded-xl bg-white">
                                    <p className="text-sm font-medium text-gray-700">이미지 모델</p>
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {imageModels.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setImageModelId(item.id);
                                                    setImageQuality(item.qualities[0].id);
                                                }}
                                                className={`w-full px-3 py-2 rounded-lg border text-left text-sm transition-all ${
                                                    imageModelId === item.id
                                                        ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-24 h-14 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                                                        <img
                                                            src={getPreviewImageUrl(item)}
                                                            alt={`${item.label} 미리보기`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            onError={(event) => {
                                                                const img = event.currentTarget;
                                                                if (img.dataset.fallbackApplied === 'true') {
                                                                    return;
                                                                }
                                                                img.dataset.fallbackApplied = 'true';
                                                                img.src = item.fallbackPreviewImageUrl || '/styles/minimalist.png';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="font-medium truncate">{item.label}</div>
                                                        <div className="text-xs text-gray-500 leading-relaxed">{item.description}</div>
                                                        <div className="text-[11px] text-gray-500">예상 {item.qualities[0].credits}~{item.qualities[item.qualities.length - 1].credits} credits / image</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        {(selectedImageModel?.qualities || []).map((quality) => (
                                            <button
                                                key={quality.id}
                                                type="button"
                                                onClick={() => setImageQuality(quality.id)}
                                                className={`px-3 py-1 text-xs rounded-md border ${selectedImageQuality?.id === quality.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200'}`}
                                            >
                                                {quality.id} ({quality.credits})
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 p-3.5 border rounded-xl bg-white">
                                    <p className="text-sm font-medium text-gray-700">비디오 모델</p>
                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {videoModels.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onMouseEnter={(event) => showHoverPreviewForCard(item.id, event.currentTarget)}
                                                onMouseLeave={scheduleHideHoverPreview}
                                                onFocus={(event) => showHoverPreviewForCard(item.id, event.currentTarget)}
                                                onBlur={scheduleHideHoverPreview}
                                                onClick={() => {
                                                    setVideoModelId(item.id);
                                                    setVideoResolution(item.resolutions[0].id);
                                                }}
                                                className={`relative w-full px-3 py-2 rounded-lg border text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                                                    videoModelId === item.id
                                                        ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="relative w-24 h-14 shrink-0" data-video-preview-anchor="true">
                                                        <div className="relative w-full h-full overflow-hidden rounded-md border bg-slate-100">
                                                        {item.previewVideoUrl && !failedVideoPreviewIds[item.id] ? (
                                                            <>
                                                                {!readyVideoPreviewIds[item.id] && (
                                                                    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
                                                                )}
                                                                <video
                                                                    src={item.previewVideoUrl}
                                                                    className={`w-full h-full object-cover transition-opacity duration-300 ${readyVideoPreviewIds[item.id] ? 'opacity-100' : 'opacity-0'}`}
                                                                    muted
                                                                    loop
                                                                    autoPlay
                                                                    playsInline
                                                                    preload="auto"
                                                                    aria-label={`${item.label} 미리보기 영상`}
                                                                    onLoadedData={() => markVideoPreviewReady(item.id)}
                                                                    onError={() => markVideoPreviewFailed(item.id)}
                                                                >
                                                                    <track kind="captions" srcLang="ko" label="미리보기 자막" src="data:text/vtt,WEBVTT" />
                                                                </video>
                                                            </>
                                                        ) : (
                                                            <img
                                                                src={getPreviewImageUrl(item)}
                                                                alt={`${item.label} 미리보기`}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                onError={(event) => {
                                                                    const img = event.currentTarget;
                                                                    if (img.dataset.fallbackApplied === 'true') {
                                                                        return;
                                                                    }
                                                                    img.dataset.fallbackApplied = 'true';
                                                                    img.src = item.fallbackPreviewImageUrl || '/styles/minimalist.png';
                                                                }}
                                                            />
                                                        )}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="font-medium truncate">{item.label}</div>
                                                        <div className="text-xs text-gray-500 leading-relaxed">{item.description}</div>
                                                        <div className="text-[11px] text-gray-500">예상 {item.resolutions[0].creditsPerCut}~{item.resolutions[item.resolutions.length - 1].creditsPerCut} credits / 6초 컷</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {hoveredVideoModel && hoverPreview && (
                                        <div
                                            className="hidden md:block fixed z-[90] pointer-events-none"
                                            style={{ left: `${hoverPreview.left}px`, top: `${hoverPreview.top}px` }}
                                        >
                                            <div className="w-72 rounded-2xl border border-violet-200 bg-white/95 backdrop-blur-sm shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex items-center justify-between px-1 pb-2">
                                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Hover Preview</span>
                                                    <span className="text-[11px] text-gray-500 truncate max-w-[150px]">{hoveredVideoModel.label}</span>
                                                </div>
                                                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-slate-100 aspect-video">
                                                    {hoveredVideoModel.previewVideoUrl && !failedVideoPreviewIds[hoveredVideoModel.id] ? (
                                                        <>
                                                            {!readyVideoPreviewIds[hoveredVideoModel.id] && (
                                                                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
                                                            )}
                                                            <video
                                                                src={hoveredVideoModel.previewVideoUrl}
                                                                className={`w-full h-full object-cover transition-opacity duration-300 ${readyVideoPreviewIds[hoveredVideoModel.id] ? 'opacity-100' : 'opacity-0'}`}
                                                                muted
                                                                loop
                                                                autoPlay
                                                                playsInline
                                                                preload="auto"
                                                                aria-label={`${hoveredVideoModel.label} 확대 미리보기 영상`}
                                                                onLoadedData={() => markVideoPreviewReady(hoveredVideoModel.id)}
                                                                onError={() => markVideoPreviewFailed(hoveredVideoModel.id)}
                                                            >
                                                                <track kind="captions" srcLang="ko" label="확대 미리보기 자막" src="data:text/vtt,WEBVTT" />
                                                            </video>
                                                        </>
                                                    ) : (
                                                        <img
                                                            src={getPreviewImageUrl(hoveredVideoModel)}
                                                            alt={`${hoveredVideoModel.label} 확대 미리보기`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            onError={(event) => {
                                                                const img = event.currentTarget;
                                                                if (img.dataset.fallbackApplied === 'true') {
                                                                    return;
                                                                }
                                                                img.dataset.fallbackApplied = 'true';
                                                                img.src = hoveredVideoModel.fallbackPreviewImageUrl || '/styles/minimalist.png';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {(selectedVideoModel?.resolutions || []).map((resolution) => (
                                            <button
                                                key={resolution.id}
                                                type="button"
                                                onClick={() => setVideoResolution(resolution.id)}
                                                className={`px-3 py-1 text-xs rounded-md border ${selectedVideoResolution?.id === resolution.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200'}`}
                                            >
                                                {resolution.id} ({resolution.creditsPerCut})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="autopilot-topic" className="text-sm font-medium text-gray-700">영상 주제</label>
                        <textarea
                            id="autopilot-topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={`예: 현대 사회에서 AI가 가져올 변화와 기회에 대해 설명하는 ${durationSeconds}초 영상...`}
                            rows={3}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={startAutopilot}
                        disabled={!topic || isRunning}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ✨ 오토파일럿 시작하기
                    </button>
                </div>
            )}

            {(status === 'running' || status === 'completed' || status === 'error') && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className={status === 'error' ? 'text-red-500' : 'text-violet-600'}>
                                {status === 'running' ? 'AI 에이전트가 작업 중입니다...' : status === 'completed' ? '작업 완료!' : '오류 발생'}
                            </span>
                            <span className="text-gray-500">{progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-violet-600'}`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-6 shadow-lg overflow-hidden font-mono text-sm relative">
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="ml-2 text-gray-400 text-xs">autopilot-progress.log</span>
                        </div>

                        <div className="mt-6 h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                            {logs.map((log) => (
                                <div key={`${log.timestamp}-${log.message}`} className="flex gap-3 text-gray-300 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-gray-600 flex-shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString([], {
                                            hour12: false,
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                    </span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {status === 'completed' && projectId && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                onClick={() => router.push(`/create/video?projectId=${projectId}`)}
                                className="px-8 py-3 bg-violet-600 text-white rounded-full font-bold shadow-lg hover:bg-violet-700 transition-all hover:scale-105 animate-bounce"
                            >
                                🎬 결과물 확인하러 가기
                            </button>
                        </div>
                    )}

                    {status === 'running' && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                onClick={stopAutopilot}
                                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                            >
                                🛑 생성 중단하기
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex justify-center pt-4">
                            <button
                                type="button"
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                다시 시도하기
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
