
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { Project } from '@/types/database';

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
    const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'warn' | 'error'; message: string } | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<'titles' | 'description' | 'tags' | null>(null);

    // Initial Load
    const fetchProjectData = useCallback(async () => {
        setIsLoading(true);
        // Fetch Project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) {
            console.error('[ThumbnailPage] Fetch Error:', error);
            setNotice({ type: 'error', message: `프로젝트 로딩 실패: ${error.message}` });
            setIsLoading(false);
            return;
        }

        if (project) {
            const projectRow = project as Project;
            setProjectData(projectRow);
            if (projectRow.thumbnail_url) setImageUrl(projectRow.thumbnail_url);

            // 1. Try fetching from project object (fastest, if cache updated)
            let dbMetadata = projectRow.youtube_metadata as { titles?: string[]; description?: string; tags?: string } | null;

            // Populate metadata
            if (dbMetadata && (dbMetadata.titles || dbMetadata.description || dbMetadata.tags)) {
                setMetadata({
                    titles: dbMetadata.titles || [],
                    description: dbMetadata.description || '',
                    tags: dbMetadata.tags || '',
                });
            }

            // Fetch Segments to get the REAL script language
            const { data: segments } = await supabase
                .from('segments')
                .select('script_text')
                .eq('project_id', projectId)
                .order('order_index');

            if (segments) {
                const text = (segments as Array<{ script_text: string }>).map((s) => s.script_text).join(' ');
                setFullScriptText(text);
            }
        }
        setIsLoading(false);
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;
        fetchProjectData();
    }, [projectId, fetchProjectData]);

    const handleGenerateMetadata = async () => {
        if (!projectData) {
            console.error('[ThumbnailPage] Cannot generate: Project data missing');
            return;
        }
        setIsGenerating(true);
        const scriptInput = fullScriptText || projectData.topic || '';

        try {
            const metaRes = await fetch('/api/metadata/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    scriptText: scriptInput
                })
            }).then(r => r.json());

            if (metaRes.metadata) setMetadata(metaRes.metadata);
        } catch (e) {
            console.error(e);
            setNotice({ type: 'error', message: '메타데이터 생성에 실패했습니다.' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAll = useCallback(async () => {
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
            setNotice({ type: 'error', message: '생성 중 오류가 발생했습니다.' });
        } finally {
            setIsGenerating(false);
        }
    }, [fullScriptText, projectData, projectId]);

    // Autopilot Logic
    useEffect(() => {
        const autopilot = searchParams.get('autopilot') === 'true';
        if (autopilot && projectData && !imageUrl && !isGenerating) {
            handleGenerateAll();
        } else if (autopilot && imageUrl && metadata) {
            const targetStep = searchParams.get('targetStep');
            setTimeout(() => {
                router.push(`/project/${projectId}/preview?autopilot=true&targetStep=${targetStep}`);
            }, 2000);
        }
    }, [projectData, imageUrl, metadata, isGenerating, handleGenerateAll, projectId, router, searchParams]);

    const handleRegeneratePart = async (part: 'titles' | 'description' | 'tags') => {
        if (!projectData || !metadata) return;

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
                const originalText = part === 'titles' ? '제목' : part === 'description' ? '설명' : '태그';
                setNotice({ type: 'success', message: `${originalText} 재생성이 완료되었습니다.` });
            }
        } catch (e) {
            console.error(e);
            setNotice({ type: 'error', message: '재생성에 실패했습니다.' });
        } finally {
            setConfirmTarget(null);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setNotice({ type: 'success', message: '클립보드에 복사되었습니다.' });
        } catch {
            setNotice({ type: 'error', message: '복사에 실패했습니다. 다시 시도해 주세요.' });
        }
    };

    if (isLoading) return <div className="p-12 text-center">로딩 중...</div>;

    return (
        <div className="space-y-6">
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

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📦 패키징 (썸네일 & 메타데이터)</h2>
                    <p className="text-gray-500 mt-1">유튜브 업로드를 위한 최적의 패키지를 생성합니다. (손실 회피 심리학 적용)</p>
                </div>
                <button
                    type="button"
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
                                    <button type="button" onClick={handleGenerateAll} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium">🔄 다시 생성</button>
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
                                    <p className="text-sm font-medium text-gray-500">🔥 클릭을 부르는 제목 (5종)</p>
                                    <button type="button" onClick={() => setConfirmTarget('titles')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 제목만 재생성</button>
                                </div>
                                {metadata.titles.map((title) => (
                                    <div key={title} className="flex gap-2">
                                        <input readOnly value={title} className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-violet-500" />
                                        <button type="button" onClick={() => copyToClipboard(title)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">📋</button>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-500">📄 설명</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setConfirmTarget('description')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 설명만 재생성</button>
                                        <button type="button" onClick={() => copyToClipboard(metadata.description)} className="text-xs text-violet-600 hover:underline">전체 복사</button>
                                    </div>
                                </div>
                                <textarea readOnly value={metadata.description} rows={5} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm resize-none focus:ring-2 focus:ring-violet-500" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-500">🏷️ 태그 (실시간 검색어)</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setConfirmTarget('tags')} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">🔄 태그만 재생성</button>
                                        <button type="button" onClick={() => copyToClipboard(metadata.tags)} className="text-xs text-violet-600 hover:underline">복사</button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input readOnly value={metadata.tags} className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-violet-500" />
                                    <button type="button" onClick={() => copyToClipboard(metadata.tags)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">📋</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-gray-50 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 p-8">
                            {isGenerating ? (
                                <span className="text-violet-600 font-medium animate-pulse">심리학적 분석 중...</span>
                            ) : (
                                <>
                                    <div className="text-center">
                                        <p className="text-gray-500 mb-1">메타데이터가 아직 없습니다</p>
                                        <p className="text-sm text-gray-400">영상 내용을 분석하여 최적의 제목과 태그를 생성하세요</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateMetadata}
                                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <span>✨</span> 메타데이터만 생성
                                    </button>
                                </>
                            )}
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

            {confirmTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl border shadow-xl p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">재생성 확인</h3>
                        <p className="text-sm text-gray-600">
                            {confirmTarget === 'titles' ? '제목' : confirmTarget === 'description' ? '설명' : '태그'}만 다시 생성할까요?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmTarget(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRegeneratePart(confirmTarget)}
                                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                            >
                                재생성
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
