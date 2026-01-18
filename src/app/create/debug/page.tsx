'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [project, setProject] = useState<any>(null);
    const [segments, setSegments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (projectId) fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
        const { data: segs } = await supabase.from('segments').select('*').eq('project_id', projectId).order('order_index');

        setProject(proj);
        setSegments(segs || []);
        setLoading(false);
    };

    if (!projectId) return <div className="p-10">URL에 ?projectId=... 를 입력해주세요.</div>;

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold">🕵️‍♂️ 데이터 디버거</h1>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="font-bold mb-4 text-lg">📁 프로젝트 정보</h2>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(project, null, 2)}
                </pre>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                <h2 className="font-bold text-lg">🔌 시스템 상태 (Test)</h2>
                <div className="flex gap-4">
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/image/generate', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        prompt: 'Test',
                                        style: 'anime',
                                        scriptText: 'test'
                                    })
                                });
                                const data = await res.json();
                                alert(res.ok ? '✅ 이미지 API 정상: ' + data.imageUrl.slice(0, 30) : '❌ 이미지 API 오류: ' + data.error + ' (' + data.details + ')');
                            } catch (e: any) {
                                alert('❌ 네트워크 오류: ' + e.message);
                            }
                        }}
                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
                    >
                        🧪 이미지 생성 API 테스트
                    </button>
                    <button
                        onClick={() => window.open(`/create/image?projectId=${projectId}`, '_blank')}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                    >
                        🖼️ 이미지 페이지 열기
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="font-bold mb-4 text-lg">🎬 세그먼트 ({segments.length}개)</h2>
                {segments.length === 0 ? (
                    <p className="text-red-500 font-bold">❌ 저장된 세그먼트가 없습니다!</p>
                ) : (
                    <div className="space-y-2">
                        {segments.map((seg, i) => (
                            <div key={seg.id} className="border p-2 rounded text-xs hover:bg-gray-50">
                                <span className="font-bold text-violet-600 mr-2">[{i}]</span>
                                {seg.script_text.slice(0, 50)}...
                                <span className="ml-2 text-gray-400">({seg.audio_url ? '🔊있음' : '🔈없음'})</span>
                            </div>
                        ))}
                    </div>
                )}
                <details className="mt-4">
                    <summary className="text-sm cursor-pointer text-gray-500">전체 JSON 보기</summary>
                    <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs h-96">
                        {JSON.stringify(segments, null, 2)}
                    </pre>
                </details>
            </div>

            <button
                onClick={fetchData}
                className="fixed bottom-8 right-8 bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-violet-700 font-bold"
            >
                🔄 새로고침
            </button>
        </div>
    );
}
