'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LogMessage {
    message: string;
    timestamp: number;
}

export default function AutopilotPage() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [projectId, setProjectId] = useState<string | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const startAutopilot = async () => {
        if (!topic) return alert('주제를 입력해주세요!');

        setIsRunning(true);
        setStatus('running');
        setProgress(0);
        setLogs([]);

        try {
            const response = await fetch('/api/autopilot/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, style: 'anime', duration: 30 }),
            });

            if (!response.ok) throw new Error('Failed to start autopilot');

            // Handle SSE
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        const eventName = line.split('\n')[0].replace('event: ', '');
                        const dataStr = line.split('\n')[1]?.replace('data: ', '');

                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);

                            if (eventName === 'log') {
                                setLogs(prev => [...prev, { message: data.message, timestamp: Date.now() }]);
                            } else if (eventName === 'progress') {
                                setProgress(data.progress);
                            } else if (eventName === 'project_created') {
                                setProjectId(data.projectId);
                            } else if (eventName === 'completed') {
                                setStatus('completed');
                                setProgress(100);
                            } else if (eventName === 'error') {
                                setStatus('error');
                                setLogs(prev => [...prev, { message: `❌ Error: ${data.message}`, timestamp: Date.now() }]);
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data', e);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('Autopilot error:', error);
            setStatus('error');
            setLogs(prev => [...prev, { message: `❌ System Error: ${error.message}`, timestamp: Date.now() }]);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                    AutoVideo Agent
                </h1>
                <p className="text-gray-500">주제만 입력하면 대본부터 영상까지 한 번에 생성합니다.</p>
            </div>

            {status === 'idle' && (
                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">영상 주제</label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="예: 현대 사회에서 AI가 가져올 변화와 기회에 대해 설명하는 30초 영상..."
                            rows={3}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <button
                        onClick={startAutopilot}
                        disabled={!topic}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ✨ 오토파일럿 시작하기
                    </button>
                </div>
            )}

            {(status === 'running' || status === 'completed' || status === 'error') && (
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className={status === 'error' ? 'text-red-500' : 'text-violet-600'}>
                                {status === 'running' ? 'AI 에이전트가 작업 중입니다...' :
                                    status === 'completed' ? '작업 완료!' : '오류 발생'}
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

                    {/* Terminal Log */}
                    <div className="bg-gray-900 rounded-2xl p-6 shadow-lg overflow-hidden font-mono text-sm relative">
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="ml-2 text-gray-400 text-xs">agent-logs.sh</span>
                        </div>

                        <div className="mt-6 h-[300px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-700">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-3 text-gray-300 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="text-gray-600 flex-shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                                onClick={() => router.push(`/create/video?projectId=${projectId}`)}
                                className="px-8 py-3 bg-violet-600 text-white rounded-full font-bold shadow-lg hover:bg-violet-700 transition-all hover:scale-105 animate-bounce"
                            >
                                🎬 결과물 확인하러 가기
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex justify-center pt-4">
                            <button
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
