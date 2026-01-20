// @ts-nocheck
import { NextRequest } from 'next/server';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import os from 'os';


// 렌더링 타임아웃 제한 없음 (로컬 환경)
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            const sendLog = (message: string) => {
                sendEvent('log', { message, timestamp: Date.now() });
            };

            try {
                const body = await req.json();
                const { segments, compositionId = 'MainVideo', subtitleStyle, settings, fps = 30, skipSubtitles = false } = body;

                sendLog('🚀 렌더링 프로세스를 시작합니다...');
                sendLog(`⚙️ FPS: ${fps}, 자막: ${skipSubtitles ? '없음' : '있음'}`);

                // 0. Pre-download assets to prevent socket hang up
                // Construct base URL for local assets
                const protocol = req.headers.get('x-forwarded-proto') || 'http';
                const host = req.headers.get('host');
                const baseUrl = `${protocol}://${host}`;

                sendLog(`📥 에셋 다운로드 중... (Base: ${baseUrl})`);
                const { localSegments, createdFiles } = await preDownloadAssets(segments, baseUrl, sendLog);
                sendLog('✅ 에셋 다운로드 완료');

                // 1. Bundle
                const entryPoint = path.resolve('./src/remotion/index.ts');
                sendLog(`📦 번들링을 시작합니다... (Entry: ${path.basename(entryPoint)})`);

                const bundleLocation = await bundle({
                    entryPoint,
                    webpackOverride: (config) => config,
                });
                sendLog('✅ 번들링 완료');

                // 2. Compositions
                sendLog('🔍 컴포지션 정보를 분석 중입니다...');
                const compositions = await getCompositions(bundleLocation, {
                    inputProps: { segments: localSegments, subtitleStyle, settings, fps, skipSubtitles },
                });

                const composition = compositions.find((c) => c.id === compositionId);
                if (!composition) {
                    throw new Error(`Composition ${compositionId} not found`);
                }
                sendLog(`✅ 컴포지션 확인: ${composition.id} (${composition.width}x${composition.height})`);

                // Duration Calculation (including padding and transition, dynamic FPS)
                const padding = settings?.padding || 0.5;
                const transitionType = settings?.transitionType || 'slide';
                const transitionFrames = transitionType === 'none' ? 0 : Math.round(20 * (fps / 30)); // Scale with FPS

                const totalDurationInFrames = segments.reduce((acc: number, seg: any) => {
                    const durationWithPadding = (seg.duration || 3) + padding;
                    return acc + Math.max(Math.floor(durationWithPadding * fps), 1) + transitionFrames;
                }, 0) - (segments.length > 1 ? transitionFrames * (segments.length - 1) : 0) + transitionFrames;
                sendLog(`⏱️ 총 프레임 수: ${totalDurationInFrames} frames (${fps}fps, padding: ${padding}s, transition: ${transitionType})`);

                // 3. Render
                const tempOutput = path.join(os.tmpdir(), `autovideo-${Date.now()}.mp4`);
                sendLog(`🎬 렌더링을 시작합니다... (Output: ${path.basename(tempOutput)})`);

                await renderMedia({
                    composition,
                    serveUrl: bundleLocation,
                    codec: 'h264',
                    outputLocation: tempOutput,
                    inputProps: { segments: localSegments, subtitleStyle, settings, fps, skipSubtitles },
                    // fps: 30, // composition 설정 따름
                    onProgress: (p) => {
                        const progress = Math.round(p.progress * 100);
                        sendEvent('progress', { progress });
                    },
                });

                sendLog('✅ 렌더링이 완료되었습니다! 결과 전송 준비 중...');

                // 4. Send Filename for Download API
                // 파일은 /tmp에 두고, 파일명만 클라이언트에 전달하여 별도 다운로드 API를 통해 받게 함.
                const filename = path.basename(tempOutput);

                sendLog('📤 클라이언트에 다운로드 정보를 전송합니다...');

                sendEvent('result', {
                    message: 'Rendering completed successfully',
                    filename: filename
                });
                sendEvent('completed', { success: true });

                // Cleanup source assets
                for (const file of createdFiles) {
                    try { fs.unlinkSync(file); } catch (e) { }
                }

                controller.close();

            } catch (error: any) {
                console.error('Render stream error:', error);
                sendEvent('error', { message: error.message || 'Unknown error' });

                // Cleanup source assets (if defined)
                if (typeof createdFiles !== 'undefined') {
                    for (const file of createdFiles) {
                        try { fs.unlinkSync(file); } catch (e) { }
                    }
                }

                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// Pre-download assets to prevent socket hang up during Remotion render
async function preDownloadAssets(
    segments: any[],
    baseUrl: string,
    sendLog: (msg: string) => void
): Promise<{ localSegments: any[], createdFiles: string[] }> {
    // Ensure temp_renders directory exists
    const publicDir = path.join(process.cwd(), 'public');
    const tempDir = path.join(publicDir, 'temp_renders');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Cleanup old files (older than 1 hour)
    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 60 * 60 * 1000) { // 1 hour
                fs.unlinkSync(filePath);
            }
        }
    } catch (e) {
        console.error('Cleanup error:', e);
    }

    const createdFiles: string[] = [];

    const downloadFile = async (url: string, type: 'audio' | 'video'): Promise<string> => {
        if (!url) return '';
        // If already local (starts with base url or relative), skip
        if (url.startsWith(baseUrl) || url.startsWith('/')) return url;

        const ext = type === 'audio' ? 'mp3' : 'mp4';
        const filename = `render_${type}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const localPath = path.join(tempDir, filename);

        // Retry logic
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(60000) // 60s timeout
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const buffer = Buffer.from(await response.arrayBuffer());
                fs.writeFileSync(localPath, buffer);
                createdFiles.push(localPath);

                // Return full HTTP URL
                return `${baseUrl}/temp_renders/${filename}`;
            } catch (error: any) {
                if (attempt === 2) throw error;
                sendLog(`⚠️ 다운로드 재시도 (${attempt + 1}/3): ${path.basename(url)}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return '';
    };

    const localSegments = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const localSeg = { ...seg };

        // Download audio
        if (seg.audio_url) {
            try {
                localSeg.audio_url = await downloadFile(seg.audio_url, 'audio');
            } catch (e: any) {
                sendLog(`❌ 오디오 다운로드 실패: ${e.message}`);
                throw e;
            }
        }

        // Download video (if no upscaled version)
        if (seg.video_url && !seg.upscaled_video_url) {
            try {
                localSeg.video_url = await downloadFile(seg.video_url, 'video');
            } catch (e: any) {
                sendLog(`❌ 비디오 다운로드 실패: ${e.message}`);
                throw e;
            }
        }

        // Download upscaled video
        if (seg.upscaled_video_url) {
            try {
                localSeg.upscaled_video_url = await downloadFile(seg.upscaled_video_url, 'video');
            } catch (e: any) {
                sendLog(`❌ 업스케일 비디오 다운로드 실패: ${e.message}`);
                throw e;
            }
        }

        localSegments.push(localSeg);
        sendLog(`📥 [${i + 1}/${segments.length}] 에셋 다운로드 완료`);
    }

    return { localSegments, createdFiles };
}
