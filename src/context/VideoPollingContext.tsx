'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export type LogType = 'info' | 'success' | 'warn' | 'error';

interface LogMessage {
    id: string;
    type: LogType;
    message: string;
    timestamp: number;
}

interface VideoPollingContextType {
    isPolling: boolean;
    generatingIds: Set<string>;
    logs: LogMessage[];
    startPolling: (segmentId: string, requestId: string, provider: string) => Promise<boolean>;
    addLog: (type: LogType, message: string) => void;
    clearLogs: () => void;
    resumePendingJobs: (projectId: string) => Promise<void>;
    addGeneratingId: (segmentId: string) => void;
    removeGeneratingId: (segmentId: string) => void;
    lastCompletedJob: { segmentId: string, videoUrl: string } | null;
}

const VideoPollingContext = createContext<VideoPollingContextType | undefined>(undefined);

export function VideoPollingProvider({ children }: { children: React.ReactNode }) {
    const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
    const [logs, setLogs] = useState<LogMessage[]>([]);
    const [lastCompletedJob, setLastCompletedJob] = useState<{ segmentId: string, videoUrl: string } | null>(null);
    const pollingIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});
    const pathname = usePathname();

    const addLog = useCallback((type: LogType, message: string) => {
        setLogs(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            type,
            message,
            timestamp: Date.now()
        }].slice(-50)); // Keep last 50 logs
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    const startPolling = useCallback(async (segmentId: string, requestId: string, provider: string) => {
        if (pollingIntervals.current[segmentId]) {
            return false;
        }

        addLog('info', `📡 상태 추적 시작: ${requestId.slice(0, 8)} (${provider})`);
        setGeneratingIds(prev => new Set(prev).add(segmentId));

        let retryCount = 0;

        const poll = async () => {
            try {
                // Check if we should still be polling
                // (If it was deleted/cancelled externally, the key might be gone)
                // However, we set the key *before* calling this loop unless it's the first run.
                // We'll manage the key setting at the end of this function for the next run.

                const res = await fetch(`/api/video/generate?requestId=${requestId}&segmentId=${segmentId}&provider=${provider}`);

                if (!res.ok) {
                    retryCount++;
                    addLog('warn', `상태 확인 실패 (${res.status}), 재시도 ${retryCount}`);
                    if (res.status >= 500 && retryCount > 5) {
                        // Persistent error, maybe backoff more?
                    }
                    // Schedule next try with standard delay
                    if (pollingIntervals.current[segmentId]) {
                        pollingIntervals.current[segmentId] = setTimeout(poll, 10000);
                    }
                    return;
                }

                retryCount = 0;
                const data = await res.json();
                const status = data.status;

                // Visual feedback for long running jobs
                if (status === 'running' && Math.random() < 0.1) {
                    addLog('info', `⏳ 영상 생성 진행 중... (Status: ${status})`);
                }

                // Completion Check
                if (status === 'completed' || status === 'failed' || status === 'succeeded' || status === 'cancelled') {
                    // Cleanup
                    if (pollingIntervals.current[segmentId]) {
                        clearTimeout(pollingIntervals.current[segmentId]);
                        delete pollingIntervals.current[segmentId];
                    }

                    setGeneratingIds(prev => {
                        const next = new Set(prev);
                        next.delete(segmentId);
                        return next;
                    });

                    if (status === 'completed' || status === 'succeeded') {
                        addLog('success', `✅ 영상 생성 완료!`);
                        if (data.videoUrl) {
                            setLastCompletedJob({ segmentId, videoUrl: data.videoUrl });
                        }
                    } else if (status === 'cancelled') {
                        addLog('warn', `🛑 영상 생성 취소됨`);
                    } else {
                        addLog('error', `❌ 영상 생성 실패: ${data.error || 'Unknown'}`);
                    }
                    return; // Stop polling
                }

                // Schedule next poll based on status
                let nextDelay = 10000; // Default 10s
                if (status === 'queued') {
                    nextDelay = 30000; // Slow down for queued items (30s)
                } else if (status === 'running') {
                    nextDelay = 10000; // Standard 10s for running
                }

                // Add random jitter +/- 2000ms to prevent thundering herd
                const jitter = Math.random() * 4000 - 2000;
                nextDelay = Math.max(5000, nextDelay + jitter);

                if (pollingIntervals.current[segmentId]) {
                    pollingIntervals.current[segmentId] = setTimeout(poll, nextDelay);
                }

            } catch (error) {
                console.error('Polling error:', error);
                retryCount++;
                addLog('warn', `폴링 에러: ${error}`);
                // Retry with standard delay
                if (pollingIntervals.current[segmentId]) {
                    pollingIntervals.current[segmentId] = setTimeout(poll, 10000);
                }
            }
        };

        // Register the poller (using a dummy timeout initially to reserve the slot, checking logic relies on key existence)
        // We set it to the recursive function's next tick basically.
        // Actually, we can just call poll() and set the key to something truthy or the timeout of the first schedule.
        // But poll() is async.

        // Let's set a placeholder or run first poll immediately?
        // To allow 'immediate check' feel, we run it now, but we need to set the key first so safeguards work.
        // We'll use a dummy timeout that resolves immediately to kick it off if we want validation or just call it.

        // Better: Set key to an initial timeout
        pollingIntervals.current[segmentId] = setTimeout(poll, 0);

        return true;
    }, [addLog]);

    const resumePendingJobs = useCallback(async (projectId: string) => {
        try {
            // Check if we are already polling something, if so, maybe we don't need to full resume, 
            // but let's check DB anyway to be sure we didn't miss anything.

            const { data: jobsData, error } = await supabase
                .from('video_jobs')
                .select('*')
                .in('status', ['queued', 'running'])
            // We need to filter by project via segments. 
            // Since this context is inside ProjectLayout, we shouldn't fetch ALL jobs for ALL projects.
            // But this query is complex to do in one go without join. 
            // Let's assume we fetch all active jobs for segments belonging to this project.
            // We need segment IDs first.

            // Optimization: We could pass segmentIds to this function, but let's keep it simple and fetch here.

            // 1. Get Segments and check if they have videos
            const { data: segments } = await supabase
                .from('segments')
                .select('id, video_url')
                .eq('project_id', projectId);

            if (!segments || segments.length === 0) return;

            // Find segments that are missing videos (candidates for repair)
            // AND segments that might be pending (we want to resume everything just in case)
            // Actually, simplified strategy:
            // 1. Resume ALL running/queued jobs (standard behavior)
            // 2. For segments WITHOUT video_url, check if there is a 'succeeded' job (repair behavior)

            const segmentIds = (segments as any[]).map(s => s.id);
            const missingVideoSegmentIds = (segments as any[]).filter(s => !s.video_url).map(s => s.id);

            // 2. Get All Relevant Jobs
            // We want:
            // - Any job in 'queued' or 'running' state (for normal resume)
            // - OR any job in 'succeeded' state IF it belongs to a segment with missing video (for repair)

            const { data: jobs } = await supabase
                .from('video_jobs')
                .select('*')
                .in('segment_id', segmentIds)
                .order('created_at', { ascending: false }); // Get newest first

            if (jobs && jobs.length > 0) {
                // Group by segment to only pick the latest relevant job per segment
                const latestJobBySegment = new Map();
                (jobs as any[]).forEach(job => {
                    if (!latestJobBySegment.has(job.segment_id)) {
                        latestJobBySegment.set(job.segment_id, job);
                    }
                });

                let resumeCount = 0;
                let repairCount = 0;

                for (const job of Array.from(latestJobBySegment.values()) as any[]) {
                    const isMissingVideo = missingVideoSegmentIds.includes(job.segment_id);
                    const isActive = ['queued', 'running', 'in_progress'].includes(job.status);

                    // Resume if active, OR if it's a repair candidate (succeeded but missing video)
                    if (isActive || (isMissingVideo && job.status === 'succeeded')) {
                        if (!pollingIntervals.current[job.segment_id]) {
                            if (isActive) {
                                addLog('info', `🚀 작업 재개: ${job.external_job_id?.slice(0, 8)}`);
                                resumeCount++;
                            } else {
                                addLog('warn', `🛠️ 누락된 영상 복구 시도: ${job.external_job_id?.slice(0, 8)}`);
                                repairCount++;
                            }
                            startPolling(job.segment_id, job.external_job_id, job.provider);
                        }
                    }
                }

                if (resumeCount > 0 || repairCount > 0) {
                    addLog('info', `🔄 상태 동기화: 재개 ${resumeCount}개, 복구 시도 ${repairCount}개`);
                }
            } else {
                // addLog('info', '대기 중인 작업이 없습니다.');
            }

        } catch (err) {
            console.error('Resume error', err);
        }
    }, [addLog, startPolling]);

    // Clean up on unmount of the PROVIDER (which is when we leave the project layout)
    useEffect(() => {
        return () => {
            // Cleanup timeouts
            Object.values(pollingIntervals.current).forEach(t => clearTimeout(t));
            pollingIntervals.current = {};
        };
    }, []);

    const addGeneratingId = useCallback((segmentId: string) => {
        setGeneratingIds(prev => new Set(prev).add(segmentId));
    }, []);

    const removeGeneratingId = useCallback((segmentId: string) => {
        setGeneratingIds(prev => {
            const next = new Set(prev);
            next.delete(segmentId);
            return next;
        });
    }, []);

    const value = {
        isPolling: Object.keys(pollingIntervals.current).length > 0,
        generatingIds,
        logs,
        startPolling,
        addLog,
        clearLogs,
        resumePendingJobs,
        addGeneratingId,
        removeGeneratingId,
        lastCompletedJob
    };

    return (
        <VideoPollingContext.Provider value={value}>
            {children}
        </VideoPollingContext.Provider>
    );
}

export function useVideoPolling() {
    const context = useContext(VideoPollingContext);
    if (context === undefined) {
        throw new Error('useVideoPolling must be used within a VideoPollingProvider');
    }
    return context;
}
