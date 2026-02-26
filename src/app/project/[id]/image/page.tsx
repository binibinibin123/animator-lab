'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Segment } from '@/types/database';

export default function ImagePage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentGeneratingId, setCurrentGeneratingId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [resolution, setResolution] = useState<'2K' | '4K'>('2K');
    const [customPrompt, setCustomPrompt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [projectStyle, setProjectStyle] = useState<string>('anime');
    const [projectStyleText, setProjectStyleText] = useState<string>('');
    const [projectVisualMode, setProjectVisualMode] = useState<'legacy' | 'character_fixed' | 'style_fixed'>('legacy');
    const [hasCharacterReference, setHasCharacterReference] = useState(false);
    const [hasStyleReference, setHasStyleReference] = useState(false);
    const imageProvider = 'gemini';

    // Logs for real-time feedback
    const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'warn'; message: string }>>([]);
    const [showLogs, setShowLogs] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = (type: 'info' | 'success' | 'error' | 'warn', message: string) => {
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-50), { time, type, message }]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    useEffect(() => {
        if (projectId) {
            fetchSegments();
        }
    }, [projectId]);

    useEffect(() => {
        const seg = segments.find(s => s.id === selectedSegmentId);
        if (seg) {
            setCustomPrompt(seg.visual_description || '');
        }
    }, [selectedSegmentId, segments]);

    const fetchSegments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch project style first
            const { data: projectData } = await supabase
                .from('projects')
                .select('style, style_text, visual_mode, character_reference_url, style_reference_url')
                .eq('id', projectId)
                .single();

            const project = projectData as {
                style?: string;
                style_text?: string | null;
                visual_mode?: 'legacy' | 'character_fixed' | 'style_fixed';
                character_reference_url?: string | null;
                style_reference_url?: string | null;
            } | null;

            if (project) {
                if (project.style) {
                    setProjectStyle(project.style);
                }
                setProjectStyleText(project.style_text || '');
                setProjectVisualMode(project.visual_mode || 'legacy');
                setHasCharacterReference(!!project.character_reference_url);
                setHasStyleReference(!!project.style_reference_url);
            }

            const { data, error: fetchError } = await supabase
                .from('segments')
                .select('id, project_id, order_index, script_text, image_url, visual_description')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

            if (fetchError) throw fetchError;

            if (data) {
                setSegments(data as Segment[]);
                if (data.length > 0 && !selectedSegmentId) {
                    setSelectedSegmentId((data as Segment[])[0].id);
                }
            }
        } catch (err: any) {
            console.error('Error loading segments:', err);
            setError(err.message || '데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // Autopilot Logic
    useEffect(() => {
        const checkAutopilot = async () => {
            const autopilot = new URLSearchParams(window.location.search).get('autopilot') === 'true';
            if (!autopilot || isLoading || segments.length === 0) return;

            const allHasImage = segments.every(s => s.image_url);

            if (allHasImage) {
                // Done! Move to next step
                const targetStep = new URLSearchParams(window.location.search).get('targetStep');
                console.log('[Autopilot] Image generation complete. Moving to Video step...');
                router.push(`/project/${projectId}/video?autopilot=true&targetStep=${targetStep}`);
            } else if (!isGenerating) {
                // Trigger auto-generation
                console.log('[Autopilot] Triggering auto-generation for images...');
                try {
                    await handleGenerateAll();
                } catch (e) {
                    console.error('Autopilot image gen failed', e);
                    // Prevent infinite loop if it fails immediately, but usually handleGenerateAll handles errors per segment
                }
            }
        };

        const timeout = setTimeout(checkAutopilot, 2000); // Wait for initial render/state
        return () => clearTimeout(timeout);
    }, [isLoading, segments, isGenerating]);

    const selectedSegment = segments.find(s => s.id === selectedSegmentId);

    const handleGenerateImage = async (segment: Segment) => {
        setCurrentGeneratingId(segment.id);
        setIsGenerating(true);
        addLog('info', `🎨 이미지 생성 시작 (CUT #${segments.findIndex(s => s.id === segment.id) + 1}) - ${imageProvider.toUpperCase()}`);

        try {
            addLog('info', `📤 API 요청 중...`);
            const response = await fetch('/api/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: customPrompt || undefined,
                            scriptText: segment.script_text,
                            segmentId: segment.id,
                            projectId,
                            resolution,
                            style: projectStyle,
                            styleText: projectStyleText,
                            provider: imageProvider,
                        }),
                    });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate image');
            }
            const data = await response.json();

            setSegments(prev => prev.map(s =>
                s.id === segment.id ? { ...s, image_url: data.imageUrl } : s
            ));
            setCustomPrompt('');
            addLog('success', `✅ 이미지 생성 완료!`);
        } catch (error: any) {
            console.error('Image Error:', error);
            addLog('error', `❌ 이미지 생성 실패: ${error.message}`);
        } finally {
            setCurrentGeneratingId(null);
            setIsGenerating(false);
        }
    };

    const handleGenerateAll = async () => {
        setIsGenerating(true);
        addLog('info', `🚀 전체 이미지 생성 시작 (${segments.filter(s => !s.image_url).length}개 컷)`);

        for (const segment of segments) {
            if (!segment.image_url) {
                const cutIndex = segments.findIndex(s => s.id === segment.id) + 1;
                setCurrentGeneratingId(segment.id);
                addLog('info', `🎨 CUT #${cutIndex} 생성 중... (${imageProvider.toUpperCase()})`);

                try {
                    const response = await fetch('/api/image/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: segment.visual_description || undefined,
                            scriptText: segment.script_text,
                            segmentId: segment.id,
                            projectId,
                            resolution,
                            style: projectStyle,
                            styleText: projectStyleText,
                            provider: imageProvider,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Failed to generate image');
                    }
                    const data = await response.json();

                    setSegments(prev => prev.map(s =>
                        s.id === segment.id ? { ...s, image_url: data.imageUrl } : s
                    ));
                    addLog('success', `✅ CUT #${cutIndex} 완료!`);
                } catch (error: any) {
                    console.error('Image Error for segment:', segment.id, error);
                    addLog('error', `❌ CUT #${cutIndex} 실패: ${error.message}`);
                }
                setCurrentGeneratingId(null);
            }
        }
        setIsGenerating(false);
        addLog('success', `🎉 전체 생성 완료!`);
    };

    const handleDeleteAllImages = async () => {
        if (!confirm('정말로 모든 이미지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const response = await fetch('/api/project/reset-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, type: 'image' }),
            });

            if (!response.ok) {
                throw new Error('Failed to reset images');
            }

            setSegments(prev => prev.map(s => ({ ...s, image_url: null })));
            addLog('success', '🗑️ 모든 이미지가 삭제되었습니다.');
        } catch (error) {
            console.error('Delete all images error:', error);
            addLog('error', '전체 이미지 삭제 실패');
        }
    };

    const handleDeleteImage = async (segmentId: string) => {
        if (!confirm('이미지를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch('/api/segment/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentId,
                    image_url: null
                }),
            });

            if (!response.ok) throw new Error('Failed to delete image');

            setSegments(prev => prev.map(s =>
                s.id === segmentId ? { ...s, image_url: null } : s
            ));
        } catch (error) {
            console.error('Delete Image Error:', error);
            alert('이미지 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-6">
            {/* ... (Previous UI code remains same until Main Edit Area) ... */}

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">이미지 생성</h2>
                    <p className="text-gray-500 mt-1">각 컷에 어울리는 고품질 이미지를 생성합니다.</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold">
                            모드: {projectVisualMode === 'character_fixed' ? '캐릭터 고정' : projectVisualMode === 'style_fixed' ? '스타일 고정' : '레거시'}
                        </span>
                        {projectVisualMode === 'character_fixed' && !hasCharacterReference && (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                참조 이미지 없음 - 일관성 best-effort
                            </span>
                        )}
                        {projectVisualMode === 'style_fixed' && !hasStyleReference && (
                            <span className="text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">
                                스타일 참조 없음 - 프리셋/가이드 기반
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                    {isGenerating ? '생성 중...' : '▶ 전체 생성'}
                </button>
                <button
                    onClick={handleDeleteAllImages}
                    disabled={isGenerating}
                    className="ml-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                    🗑️ 전체 삭제
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">생성기:</span>
                    <span className="px-3 py-1.5 border rounded-lg text-sm bg-white">☁️ Gemini (클라우드)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">해상도:</span>
                    <div className="flex bg-white border rounded-lg p-1">
                        <button
                            onClick={() => setResolution('2K')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${resolution === '2K' ? 'bg-violet-600 text-white' : 'hover:bg-gray-50'}`}
                        >
                            2K
                        </button>
                        <button
                            onClick={() => setResolution('4K')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${resolution === '4K' ? 'bg-violet-600 text-white' : 'hover:bg-gray-50'}`}
                        >
                            4K
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Segment List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400">데이터를 불러오는 중...</div>
                    ) : error ? (
                        <div className="p-8 text-center space-y-4">
                            <p className="text-red-500">{error}</p>
                            <button onClick={fetchSegments} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                                🔄 다시 시도
                            </button>
                        </div>
                    ) : segments.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            생성된 컷이 없습니다.
                            <Link href={`/project/${projectId}/script`} className="text-violet-600 underline text-sm mt-2 inline-block">
                                스크립트로 돌아가기
                            </Link>
                        </div>
                    ) : segments.map((seg, index) => (
                        <button
                            key={seg.id}
                            onClick={() => setSelectedSegmentId(seg.id)}
                            className={`w-full p-3 rounded-xl border-2 text-left transition-all
                                ${selectedSegmentId === seg.id
                                    ? 'border-violet-600 bg-violet-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    {seg.image_url ? (
                                        <img src={seg.image_url} alt={`Cut ${index + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-violet-600 mb-1">CUT #{index + 1}</p>
                                    <p className="text-sm text-gray-600 truncate">{seg.script_text}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Main Edit Area */}
                <div className="col-span-2 space-y-6">
                    {selectedSegment ? (
                        <div className="space-y-6">
                            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border relative group">
                                {selectedSegment.image_url ? (
                                    <>
                                        <img src={selectedSegment.image_url} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => handleDeleteImage(selectedSegment.id)}
                                            className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
                                            title="이미지 삭제"
                                        >
                                            🗑️
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                                        <span className="text-4xl">📸</span>
                                        <p>이미지가 생성되지 않았습니다</p>
                                    </div>
                                )}
                                {currentGeneratingId === selectedSegment.id && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-violet-600 font-medium">이미지 생성 중...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 block">이미지 프롬프트 (선택사항)</label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="비어두면 대본에 따라 자동으로 프롬프트가 생성됩니다..."
                                        rows={3}
                                        className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        💡 대본: "{selectedSegment.script_text.slice(0, 50)}..."
                                    </p>
                                    <div className="flex gap-2">
                                        {selectedSegment.image_url && (
                                            <button
                                                onClick={() => handleDeleteImage(selectedSegment.id)}
                                                className="px-4 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                삭제
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleGenerateImage(selectedSegment)}
                                            disabled={isGenerating}
                                            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                                        >
                                            {selectedSegment.image_url ? '다시 생성하기' : '이미지 생성'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            왼쪽에서 컷을 선택해 주세요.
                        </div>
                    )}
                </div>
            </div>

            {/* Real-time Logs Panel */}
            <div className="bg-gray-900 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs">●</span>
                        <span className="text-white text-sm font-medium">실시간 로그</span>
                        <span className="text-gray-400 text-xs">({logs.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLogs([])}
                            className="text-gray-400 hover:text-white text-xs"
                        >
                            🗑️ 지우기
                        </button>
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="text-gray-400 hover:text-white text-xs"
                        >
                            {showLogs ? '▼ 접기' : '▶ 펼치기'}
                        </button>
                    </div>
                </div>
                {showLogs && (
                    <div className="h-40 overflow-y-auto p-3 font-mono text-xs space-y-1">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 text-center py-4">이미지 생성을 시작하면 로그가 표시됩니다.</div>
                        ) : logs.map((log, i) => (
                            <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'warn' ? 'text-yellow-400' :
                                        'text-gray-300'
                                }`}>
                                <span className="text-gray-500">[{log.time}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
                <Link href={`/project/${projectId}/voice`} className="px-6 py-2 text-gray-600 hover:text-gray-800">
                    ← 이전 단계
                </Link>
                <button
                    onClick={() => router.push(`/project/${projectId}/video`)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                    다음 단계 →
                </button>
            </div>
        </div>
    );
}
