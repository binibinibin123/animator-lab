'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

const LANGUAGES = [
    { id: 'ko', label: '한국어', flag: '🇰🇷' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
];

const PERSONAS = [
    {
        id: 'finance',
        name: '📊 경제 유튜버',
        desc: '차분하고 이성적인 데이터 기반 분석',
        style: 'Bob Invests 스타일'
    },
    {
        id: 'educator',
        name: '📚 교육자',
        desc: '쉽고 친절한 설명, 단계별 학습',
        style: '강의형'
    },
    {
        id: 'storyteller',
        name: '🎭 스토리텔러',
        desc: '몰입감 있는 내러티브와 감정선',
        style: '다큐멘터리'
    },
    {
        id: 'news',
        name: '📺 뉴스 앵커',
        desc: '객관적이고 정확한 정보 전달',
        style: '뉴스 보도'
    },
    {
        id: 'entertainer',
        name: '🎉 엔터테이너',
        desc: '유머러스하고 가벼운 톤',
        style: '예능형'
    },
];

export default function ScriptPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [title, setTitle] = useState('');
    const [script, setScript] = useState('');
    const [duration, setDuration] = useState(60);
    const [language, setLanguage] = useState('ko');
    const [persona, setPersona] = useState('finance');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingScript, setHasExistingScript] = useState(false);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [projectStyle, setProjectStyle] = useState<string>('anime'); // Image style from project
    const [projectVisualMode, setProjectVisualMode] = useState<'legacy' | 'character_fixed' | 'style_fixed'>('legacy');
    const [hasCharacterReference, setHasCharacterReference] = useState(false);

    const [projectInfo, setProjectInfo] = useState<{ is_test_run: boolean; autopilot_status: string } | null>(null);

    // Load existing data
    useEffect(() => {
        const fetchProjectAndSegments = async () => {
            if (!projectId) return;

            setIsLoading(true);

            // Fetch project info
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('title, topic, duration, style, visual_mode, character_reference_url, is_test_run, autopilot_status')
                .eq('id', projectId)
                .single();

            const project = projectData as any; // simplified typing

            if (project && !projectError) {
                setTitle(project.title || '');
                if (project.duration) setDuration(project.duration);
                if (project.style) setProjectStyle(project.style);
                if (project.visual_mode) setProjectVisualMode(project.visual_mode);
                setHasCharacterReference(!!project.character_reference_url);
                setProjectInfo({
                    is_test_run: project.is_test_run,
                    autopilot_status: project.autopilot_status
                });
            }

            // Fetch existing segments (generated script)
            const { data: segmentsData, error: segmentsError } = await supabase
                .from('segments')
                .select('id, project_id, order_index, script_text, visual_description')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            const loadedSegments = (segmentsData || []) as Segment[];

            if (loadedSegments.length > 0 && !segmentsError) {
                setSegments(loadedSegments);
                setHasExistingScript(true);
                const fullScript = loadedSegments.map(s => s.script_text).join('\n\n');
                setScript(fullScript);
            } else if (project?.topic) {
                setScript(project.topic);
            }

            setIsLoading(false);
        };

        fetchProjectAndSegments();
    }, [projectId]);

    // Auto-Advance logic
    useEffect(() => {
        if (hasExistingScript && projectInfo && (projectInfo.is_test_run || projectInfo.autopilot_status === 'generating')) {
            console.log('Auto-advancing to Voice page...');
            const timer = setTimeout(() => {
                router.push(`/project/${projectId}/voice?autopilot=true`);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [hasExistingScript, projectInfo, projectId, router]);

    const handleGenerate = async () => {
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
                    language,
                    persona,
                    style: projectStyle, // Pass the image style for visual instructions
                }),
            });

            if (!response.ok) throw new Error('Failed to generate script');

            const data = await response.json();
            setTitle(data.title || title);
            router.push(`/project/${projectId}/voice`);
        } catch (error) {
            console.error('Error generating script:', error);
            alert('대본 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        router.push(`/project/${projectId}/voice`);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">어떤 영상을 만들고 싶으세요?</h2>
                <p className="text-gray-500 mt-1">주제나 대본을 입력하면 구조화를 도와드립니다.</p>
                <div className="mt-2 text-xs flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold">
                        모드: {projectVisualMode === 'character_fixed' ? '캐릭터 고정' : projectVisualMode === 'style_fixed' ? '스타일 고정' : '레거시'}
                    </span>
                    {projectVisualMode === 'character_fixed' && !hasCharacterReference && (
                        <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                            참조 이미지 없음 - 일관성 best-effort
                        </span>
                    )}
                </div>
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

            {/* Language & Persona Selection */}
            <div className="grid grid-cols-2 gap-6">
                {/* Language */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">🌐 대본 언어</label>
                    <div className="flex gap-3">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.id}
                                onClick={() => setLanguage(lang.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all
                                    ${language === lang.id
                                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="font-medium">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Persona */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">🎭 대본 스타일</label>
                    <select
                        value={persona}
                        onChange={(e) => setPersona(e.target.value)}
                        className="w-full px-4 py-3 border-2 rounded-xl bg-white focus:border-violet-600 focus:ring-0"
                    >
                        {PERSONAS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} - {p.desc}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Selected Persona Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{PERSONAS.find(p => p.id === persona)?.name.split(' ')[0]}</span>
                    <div>
                        <p className="font-medium text-gray-900">{PERSONAS.find(p => p.id === persona)?.name}</p>
                        <p className="text-sm text-gray-500">{PERSONAS.find(p => p.id === persona)?.desc}</p>
                    </div>
                </div>
            </div>

            {/* Script Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">💡 대본 / 프롬프트</label>
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder={language === 'ko'
                        ? "예시: '인공지능이 언어 교육 시스템에 미치는 영향을 설명해주세요...'"
                        : "Example: 'Explain how AI is transforming language education systems...'"
                    }
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
                    href="/"
                    className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                    ← 대시보드로
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

