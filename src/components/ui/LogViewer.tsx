'use client';

import { useEffect, useRef } from 'react';

export interface LogMessage {
    message: string;
    timestamp: number;
}

interface LogViewerProps {
    logs: LogMessage[];
    status?: 'idle' | 'running' | 'completed' | 'error';
    progress?: number;
    title?: string;
    className?: string; // 추가 스타일링을 위한 prop
}

export default function LogViewer({
    logs,
    status = 'idle',
    progress = 0,
    title = 'Process Logs',
    className = ''
}: LogViewerProps) {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Progress Bar (Optional, only show if running/completed/error) */}
            {status !== 'idle' && (
                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className={status === 'error' ? 'text-red-500' : 'text-violet-600'}>
                            {status === 'running' ? 'Processing...' :
                                status === 'completed' ? 'Completed!' : 'Error Occurred'}
                        </span>
                        <span className="text-gray-500">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-violet-600'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Terminal Log */}
            <div className="bg-gray-900 rounded-xl p-4 shadow-lg overflow-hidden font-mono text-sm relative border border-gray-700">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4 gap-2 border-b border-gray-700">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-gray-400 text-xs opacity-70">{title}</span>
                </div>

                <div className="mt-8 h-[200px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic mt-2 text-center text-xs">Waiting for logs...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="flex gap-3 text-gray-300 animate-in fade-in slide-in-from-left-1 duration-200">
                                <span className="text-gray-600 flex-shrink-0 text-xs select-none">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className="break-all whitespace-pre-wrap">{log.message}</span>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
}
