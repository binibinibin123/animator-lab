
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ThumbnailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params.id as string;

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{ titles: string[], description: string, tags: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [projectData, setProjectData] = useState<any>(null);
    const [fullScriptText, setFullScriptText] = useState<string>('');

    // Initial Load
    useEffect(() => {
        if (!projectId) return;
        fetchProjectData();
    }, [projectId]);

    const fetchProjectData = async () => {
        setIsLoading(true);
        // Fetch Project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (project) {
            setProjectData(project);
            if (project.thumbnail_url) setImageUrl(project.thumbnail_url);

            // Fetch Segments to get the REAL script language
            const { data: segments } = await supabase
                .from('segments')
                .select('script_text')
                .eq('project_id', projectId)
                .order('order_index');

            if (segments) {
                const text = segments.map(s => s.script_text).join(' ');
                setFullScriptText(text);
                console.log('[ThumbnailPage] Loaded full script text length:', text.length);
            }
        }
        setIsLoading(false);
    };

    // Autopilot Logic
    useEffect(() => {
        const autopilot = searchParams.get('autopilot') === 'true';
        if (autopilot && projectData && !imageUrl && !isGenerating) {
            console.log('[Autopilot] No thumbnail found. Generating packaging...');
            handleGenerateAll();
        } else if (autopilot && imageUrl && metadata) {
            const targetStep = searchParams.get('targetStep');
            console.log('[Autopilot] Packaging done. Moving to Final Preview...');
            setTimeout(() => {
                router.push(`/project/${projectId}/preview?autopilot=true&targetStep=${targetStep}`);
            }, 2000);
        }
    }, [projectData, imageUrl, metadata, isGenerating]);

    const handleGenerateAll = async () => {
        if (!projectData) return;
        setIsGenerating(true);

        // Use actual script text if available, fallback to topic
        const scriptInput = fullScriptText || projectData.topic || '';

        try {
            const [thumbRes, metaRes] = await Promise.all([
                fetch('/api/thumbnail/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        scriptText: scriptInput,
                        style: projectData.style
                    })
                }).then(r => r.json()),

                fetch('/api/metadata/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        scriptText: scriptInput
                    })
                }).then(r => r.json())
            ]);

            if (thumbRes.imageUrl) setImageUrl(thumbRes.imageUrl);
            if (metaRes.metadata) setMetadata(metaRes.metadata);

        } catch (e) {
            console.error('Generation failed', e);
            alert('생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegeneratePart = async (part: 'titles' | 'description' | 'tags') => {
        if (!projectData || !metadata) return;

        const originalText = part === 'titles' ? '제목' : part === 'description' ? '설명' : '태그';
        const confirmMsg = `${originalText}만 다시 생성하시겠습니까?`;
        if (!confirm(confirmMsg)) return;

        try {
            const scriptInput = fullScriptText || projectData.topic || '';
            const res = await fetch('/api/metadata/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    scriptText: scriptInput,
                    mode: part
                })
            });

            const data = await res.json();
            if (data.metadata) {
                setMetadata(prev => ({ ...prev!, ...data.metadata }));
                alert(`${originalText} 재생성 완료!`);
            }
        } catch (e) {
            console.error(e);
            alert('재생성 실패');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('복사되었습니다! 📋');
    };

    if (isLoading) return <div className="p-12 text-center">로딩 중...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📦 패키징 (썸네일 & 메타데이터)</h2>
                    <p className="text-gray-500 mt-1">유튜브 업로드를 위한 최적의 패키지를 생성합니다. (손실 회피 심리학 적용)</p>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={isGenerating}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isGenerating ? '✨ AI가 분석 중...' : '⚡ 전체 자동 생성'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Thumbnail */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">📸 썸네일 (NanoBanana Pro)</h3>
                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 relative group">
                        {imageUrl ? (
                            <>
                                <img src={imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <a href={imageUrl} download="thumbnail.png" className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium">⬇️ 다운로드</a>
                                    <button onClick={handleGenerateAll} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">🔄 다시 생성</button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                                <span className="text-4xl">🖼️</span>
                                <p>썸네일이 없습니다</p>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-violet-600 font-bold">고화질 렌더링 중...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Metadata */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800">📝 메타데이터 (심리학 적용)</h3>

                    {metadata ? (
                        <div className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-500">🔥 클릭을 부르는 제목 (5종)</label>
                                    <button onClick={() => handleRegeneratePart('titles')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 제목만 재생성</button>
                                </div>
                                {metadata.titles.map((title, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input readOnly value={title} className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-violet-500" />
                                        <button onClick={() => copyToClipboard(title)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">📋</button>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-500">📄 설명</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRegeneratePart('description')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 설명만 재생성</button>
                                        <button onClick={() => copyToClipboard(metadata.description)} className="text-xs text-violet-600 hover:underline">전체 복사</button>
                                    </div>
                                </div>
                                <textarea readOnly value={metadata.description} rows={5} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm resize-none focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-500">🏷️ 태그 (실시간 검색어)</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRegeneratePart('tags')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 태그만 재생성</button>
                                        <button onClick={() => copyToClipboard(metadata.tags)} className="text-xs text-violet-600 hover:underline">복사</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input readOnly value={metadata.tags} className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-violet-500" />
                                    <button onClick={() => copyToClipboard(metadata.tags)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">📋</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                            {isGenerating ? '심리학적 분석 중...' : '생성 버튼을 눌러주세요'}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/video`} className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 이전 단계 (영상)
                </Link>
                <Link href={`/project/${projectId}/preview`} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    완료 (미리보기) →
                </Link>
            </div>
        </div>
    );
}
