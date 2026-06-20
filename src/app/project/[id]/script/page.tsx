'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

const DIRECTION_TEMPLATES = [
    {
        id: 'ani_webtoon_cutscene',
        name: '웹툰 컷신',
        desc: '대사, 표정, 패널 전환, 컷 간 연결을 우선합니다.',
    },
    {
        id: 'ani_cinematic_sequence',
        name: '시네마틱 시퀀스',
        desc: '카메라워크, 조명, 감정선, 장면 분위기를 우선합니다.',
    },
    {
        id: 'ani_action_beat',
        name: '액션 비트',
        desc: '동작, 타이밍, 임팩트 포즈, 모션 흐름을 우선합니다.',
    },
    {
        id: 'ani_character_showcase',
        name: '캐릭터 쇼케이스',
        desc: '캐릭터 일관성, 포즈, 표정, 실루엣을 우선합니다.',
    },
    {
        id: 'ani_montage_mv',
        name: '몽타주 / MV',
        desc: '리듬, 이미지 연결, 색감, 분위기 변화를 우선합니다.',
    },
];

function isSchemaMissingColumnError(error: any) {
    const message = typeof error?.message === 'string' ? error.message : '';
    return message.includes('schema cache') && message.includes('Could not find the');
}

type ProjectInfo = {
    title?: string | null;
    topic?: string | null;
    duration?: number | null;
    style?: string | null;
    visual_mode?: 'legacy' | 'character_fixed' | 'style_fixed' | null;
    character_reference_url?: string | null;
    story_bible?: {
        directionTemplate?: string;
        genre?: string;
        tone?: string;
        negativeRules?: string;
    } | null;
};

export default function ScriptPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [title, setTitle] = useState('');
    const [brief, setBrief] = useState('');
    const [duration, setDuration] = useState(30);
    const [templateId, setTemplateId] = useState('ani_webtoon_cutscene');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingShots, setHasExistingShots] = useState(false);
    const [generationMessage, setGenerationMessage] = useState<string | null>(null);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [projectStyle, setProjectStyle] = useState('anime');
    const [projectVisualMode, setProjectVisualMode] = useState<'legacy' | 'character_fixed' | 'style_fixed'>('legacy');
    const [hasCharacterReference, setHasCharacterReference] = useState(false);

    const selectedTemplate = useMemo(
        () => DIRECTION_TEMPLATES.find((template) => template.id === templateId) || DIRECTION_TEMPLATES[0],
        [templateId]
    );

    const fetchProjectAndSegments = useCallback(async () => {
        if (!projectId) return;

        setIsLoading(true);
        const preferLegacySchema = typeof window !== 'undefined'
            && window.localStorage.getItem('animatorLabSchemaMode') === 'legacy';
        const projectColumns = preferLegacySchema
            ? 'title, topic, duration, style'
            : 'title, topic, duration, style, visual_mode, character_reference_url, story_bible';
        const segmentColumns = preferLegacySchema
            ? 'id, project_id, order_index, script_text, visual_description, duration_ms'
            : 'id, project_id, order_index, script_text, visual_description, camera_work, action_notes, lighting_notes, emotion_notes, negative_prompt, review_status, duration_ms';

        let { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select(projectColumns)
            .eq('id', projectId)
            .single();

        if (projectError && isSchemaMissingColumnError(projectError)) {
            window.localStorage.setItem('animatorLabSchemaMode', 'legacy');
            const retry = await supabase
                .from('projects')
                .select('title, topic, duration, style')
                .eq('id', projectId)
                .single();
            projectData = retry.data;
            projectError = retry.error;
        }

        const project = projectData as ProjectInfo | null;

        if (project && !projectError) {
            setTitle(project.title || '');
            setBrief(project.topic || '');
            if (project.duration) setDuration(project.duration);
            if (project.style) setProjectStyle(project.style);
            if (project.visual_mode) setProjectVisualMode(project.visual_mode);
            setHasCharacterReference(!!project.character_reference_url);

            const savedTemplate = project.story_bible?.directionTemplate;
            const matchedTemplate = DIRECTION_TEMPLATES.find((template) => template.name === savedTemplate || template.id === savedTemplate);
            if (matchedTemplate) setTemplateId(matchedTemplate.id);
        }

        let { data: segmentsData, error: segmentsError } = await supabase
            .from('segments')
            .select(segmentColumns)
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        if (segmentsError && isSchemaMissingColumnError(segmentsError)) {
            window.localStorage.setItem('animatorLabSchemaMode', 'legacy');
            const retry = await supabase
                .from('segments')
                .select('id, project_id, order_index, script_text, visual_description, duration_ms')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });
            segmentsData = retry.data;
            segmentsError = retry.error;
        }

        const loadedSegments = (segmentsData || []) as Segment[];

        if (loadedSegments.length > 0 && !segmentsError) {
            setSegments(loadedSegments);
            setHasExistingShots(true);
            setBrief(loadedSegments.map((segment) => segment.script_text).join('\n\n'));
        } else {
            setSegments([]);
            setHasExistingShots(false);
        }

        setIsLoading(false);
    }, [projectId]);

    useEffect(() => {
        void fetchProjectAndSegments();
    }, [fetchProjectAndSegments]);

    const handleGenerate = async () => {
        if (!brief.trim()) {
            alert('작품 아이디어 또는 컷보드 초안을 입력해 주세요.');
            return;
        }

        const wasExistingScript = hasExistingShots;
        setIsGenerating(true);
        setGenerationMessage(null);

        try {
            const response = await fetch('/api/script/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: brief,
                    duration,
                    projectId,
                    language: 'ko',
                    persona: templateId,
                    style: projectStyle,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate shot board');

            const data = await response.json();
            setTitle(data.title || title);
            await fetchProjectAndSegments();
            setGenerationMessage(
                wasExistingScript
                    ? '컷보드를 다시 생성했습니다. 컷별 연출 의도를 확인하고 필요한 부분을 수정하세요.'
                    : '컷보드를 생성했습니다. 컷별 연출 의도를 확인하고 필요한 부분을 수정하세요.'
            );
        } catch (error) {
            console.error('Error generating shot board:', error);
            alert('컷보드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const updateShotField = async (segmentId: string, field: keyof Segment, value: string | number | null) => {
        setSegments((prev) => prev.map((segment) => (
            segment.id === segmentId ? { ...segment, [field]: value } : segment
        )));

        const { error } = await supabase
            .from('segments')
            .update({ [field]: value } as never)
            .eq('id', segmentId)
            .eq('project_id', projectId);

        if (error) {
            console.error('Failed to update shot field:', error);
            await fetchProjectAndSegments();
        }
    };

    const addShot = async () => {
        const nextIndex = segments.length;
        let { error } = await supabase
            .from('segments')
            .insert({
                project_id: projectId,
                order_index: nextIndex,
                script_text: '새 컷의 대사 또는 나레이션',
                visual_description: '컷의 화면 구성과 피사체를 설명하세요.',
                camera_work: 'medium shot, readable staging',
                action_notes: '캐릭터의 구체적인 행동',
                lighting_notes: '일관된 장면 조명',
                emotion_notes: '읽히는 감정 상태',
                negative_prompt: 'off-model face, broken hands, unreadable text',
                duration_ms: 4000,
                review_status: 'draft',
            } as never);

        if (error && isSchemaMissingColumnError(error)) {
            const retry = await supabase
                .from('segments')
                .insert({
                    project_id: projectId,
                    order_index: nextIndex,
                    script_text: '새 컷의 대사 또는 나레이션',
                    visual_description: '컷의 화면 구성과 피사체를 설명하세요.',
                    duration_ms: 4000,
                } as never);
            error = retry.error;
        }

        if (error) {
            console.error('Failed to add shot:', error);
            return;
        }

        await fetchProjectAndSegments();
    };

    const duplicateShot = async (segment: Segment) => {
        let { error } = await supabase
            .from('segments')
            .insert({
                project_id: projectId,
                order_index: segments.length,
                script_text: segment.script_text,
                visual_description: segment.visual_description,
                camera_work: segment.camera_work,
                action_notes: segment.action_notes,
                lighting_notes: segment.lighting_notes,
                emotion_notes: segment.emotion_notes,
                negative_prompt: segment.negative_prompt,
                duration_ms: segment.duration_ms,
                review_status: 'draft',
            } as never);

        if (error && isSchemaMissingColumnError(error)) {
            const retry = await supabase
                .from('segments')
                .insert({
                    project_id: projectId,
                    order_index: segments.length,
                    script_text: segment.script_text,
                    visual_description: segment.visual_description,
                    duration_ms: segment.duration_ms,
                } as never);
            error = retry.error;
        }

        if (error) {
            console.error('Failed to duplicate shot:', error);
            return;
        }

        await fetchProjectAndSegments();
    };

    const deleteShot = async (segmentId: string) => {
        const { error } = await supabase
            .from('segments')
            .delete()
            .eq('id', segmentId)
            .eq('project_id', projectId);

        if (error) {
            console.error('Failed to delete shot:', error);
            return;
        }

        await fetchProjectAndSegments();
    };

    const moveShot = async (segmentId: string, direction: -1 | 1) => {
        const currentIndex = segments.findIndex((segment) => segment.id === segmentId);
        const targetIndex = currentIndex + direction;
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= segments.length) return;

        const current = segments[currentIndex];
        const target = segments[targetIndex];

        await Promise.all([
            supabase.from('segments').update({ order_index: target.order_index } as never).eq('id', current.id),
            supabase.from('segments').update({ order_index: current.order_index } as never).eq('id', target.id),
        ]);

        await fetchProjectAndSegments();
    };

    return (
        <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Story / Shot Board</p>
                        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">스토리를 컷보드로 분해하기</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            작품 아이디어를 애니메이션 컷으로 나누고, 각 컷의 대사, 화면 설명, 카메라워크, 액션, 조명, 감정, 금지 요소를 편집합니다.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-950 px-3 py-1 font-bold text-white">
                            {projectVisualMode === 'character_fixed' ? '캐릭터 고정' : projectVisualMode === 'style_fixed' ? '스타일 고정' : '레거시 프로젝트'}
                        </span>
                        {projectVisualMode === 'character_fixed' && !hasCharacterReference && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-bold text-amber-700">
                                참조 이미지 없음
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="space-y-5">
                    <label className="block space-y-2 text-sm font-bold text-slate-700">
                        작품 제목
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="새 애니메이션 작품"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal"
                        />
                    </label>

                    <label className="block space-y-2 text-sm font-bold text-slate-700">
                        작품 아이디어 / 컷보드 초안
                        <textarea
                            value={brief}
                            onChange={(event) => setBrief(event.target.value)}
                            placeholder="예: 새벽 한강 다리 아래에서 배달 일을 하던 소녀가, 자기 이름이 적힌 빛나는 편지를 발견한다."
                            rows={8}
                            className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-sm font-normal leading-6"
                        />
                    </label>
                </div>

                <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="space-y-2">
                        <label htmlFor="template-select" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            연출 템플릿
                        </label>
                        <select
                            id="template-select"
                            value={templateId}
                            onChange={(event) => setTemplateId(event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold"
                        >
                            {DIRECTION_TEMPLATES.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name}
                                </option>
                            ))}
                        </select>
                        <p className="rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
                            <strong className="block text-slate-950">{selectedTemplate.name}</strong>
                            {selectedTemplate.desc}
                        </p>
                    </div>

                    <label className="block space-y-2 text-xs font-bold text-slate-600">
                        목표 러닝타임
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={duration}
                                onChange={(event) => setDuration(Number(event.target.value))}
                                min={10}
                                max={600}
                                className="w-24 rounded-xl border px-3 py-2 text-center text-sm font-normal text-slate-900"
                            />
                            <span>초</span>
                        </div>
                    </label>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating || isLoading}
                        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isGenerating ? '컷보드 생성 중...' : hasExistingShots ? '컷보드 재생성' : '컷보드 생성'}
                    </button>
                </aside>
            </section>

            {generationMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {generationMessage}
                </div>
            )}

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Animator Lab</p>
                        <h3 className="text-xl font-black text-slate-950">Shot Board</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            컷별로 이미지 생성 프롬프트와 영상 생성 프롬프트의 기반이 되는 연출 메타데이터를 관리합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addShot}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        컷 추가
                    </button>
                </div>

                {segments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                        컷보드를 생성하거나 직접 컷을 추가해 시작하세요.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {segments.map((segment, index) => (
                            <article key={segment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">CUT {index + 1}</p>
                                        <p className="text-sm font-semibold text-slate-900">상태: {segment.review_status || 'draft'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => moveShot(segment.id, -1)} disabled={index === 0} className="rounded-lg border px-2.5 py-1 text-xs disabled:opacity-40">위로</button>
                                        <button type="button" onClick={() => moveShot(segment.id, 1)} disabled={index === segments.length - 1} className="rounded-lg border px-2.5 py-1 text-xs disabled:opacity-40">아래로</button>
                                        <button type="button" onClick={() => duplicateShot(segment)} className="rounded-lg border px-2.5 py-1 text-xs">복제</button>
                                        <button type="button" onClick={() => deleteShot(segment.id)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600">삭제</button>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                                        대사 / 나레이션
                                        <textarea
                                            value={segment.script_text || ''}
                                            onChange={(event) => updateShotField(segment.id, 'script_text', event.target.value)}
                                            className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                        />
                                    </label>
                                    <label className="space-y-1 text-xs font-semibold text-slate-600">
                                        이미지 프롬프트 / 화면 설명
                                        <textarea
                                            value={segment.visual_description || ''}
                                            onChange={(event) => updateShotField(segment.id, 'visual_description', event.target.value)}
                                            className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                                        />
                                    </label>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            카메라워크
                                            <input value={segment.camera_work || ''} onChange={(event) => updateShotField(segment.id, 'camera_work', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            액션
                                            <input value={segment.action_notes || ''} onChange={(event) => updateShotField(segment.id, 'action_notes', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            조명
                                            <input value={segment.lighting_notes || ''} onChange={(event) => updateShotField(segment.id, 'lighting_notes', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            감정
                                            <input value={segment.emotion_notes || ''} onChange={(event) => updateShotField(segment.id, 'emotion_notes', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem]">
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            Negative prompt
                                            <input value={segment.negative_prompt || ''} onChange={(event) => updateShotField(segment.id, 'negative_prompt', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                        <label className="space-y-1 text-xs font-semibold text-slate-600">
                                            길이 ms
                                            <input type="number" value={segment.duration_ms || 4000} onChange={(event) => updateShotField(segment.id, 'duration_ms', Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" />
                                        </label>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <div className="flex justify-between border-t pt-6">
                <Link href="/projects" className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    작품 목록으로
                </Link>
                <button
                    type="button"
                    onClick={() => router.push(`/project/${projectId}/voice`)}
                    className="rounded-xl bg-slate-950 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800"
                >
                    오디오 단계로
                </button>
            </div>
        </div>
    );
}
