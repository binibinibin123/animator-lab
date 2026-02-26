'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LogMessage {
    message: string;
    timestamp: number;
}

type VisualMode = 'character_fixed' | 'style_fixed';

const STYLE_OPTIONS = [
    { id: 'anime', name: '애니메이션' },
    { id: 'economy-1', name: '경제유튜브 1' },
    { id: 'senior-1', name: '시니어 유튜브 1' },
    { id: 'illustration', name: '일러스트' },
    { id: 'realistic', name: '실사' },
];

export default function AutopilotPage() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [visualMode, setVisualMode] = useState<VisualMode>('style_fixed');
    const [style, setStyle] = useState('anime');
    const [styleText, setStyleText] = useState('');

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'warn' | 'error'; message: string } | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const startAutopilot = async () => {
        if (!topic.trim()) {
            setNotice({ type: 'warn', message: '주제를 먼저 입력해 주세요.' });
            return;
        }

        setNotice({
            type: 'info',
            message:
                visualMode === 'character_fixed'
                    ? '현재 오토파일럿은 참조 이미지 업로드를 생성 중간에 받지 않습니다. 참조가 없으면 캐릭터 일관성은 best-effort로 처리됩니다.'
                    : '스타일 고정 모드로 오토파일럿을 시작합니다.',
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
                    duration: 30,
                    style,
                    styleText: styleText.trim() || undefined,
                    visualMode,
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
                                onClick={() => setVisualMode('character_fixed')}
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
                                onClick={() => setVisualMode('style_fixed')}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="autopilot-style" className="text-sm font-medium text-gray-700">스타일 프리셋</label>
                            <select
                                id="autopilot-style"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl"
                            >
                                {STYLE_OPTIONS.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
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
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="autopilot-topic" className="text-sm font-medium text-gray-700">영상 주제</label>
                        <textarea
                            id="autopilot-topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="예: 현대 사회에서 AI가 가져올 변화와 기회에 대해 설명하는 30초 영상..."
                            rows={3}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Phase 1 제한: 오토파일럿 실행 중에는 참조 이미지 업로드를 받지 않습니다. 필요하면 먼저 일반 생성에서 프로젝트를 만들고 참조를 저장하세요.
                    </p>

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
