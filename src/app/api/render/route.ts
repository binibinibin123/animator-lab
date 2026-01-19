import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, RenderMediaOnProgress } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { RemotionRoot } from '@/remotion/Root';

// 렌더링 타임아웃 방지 (Vercel에서는 제한이 있지만 로컬에서는 김)
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { segments, compositionId = 'MainVideo' } = body;

        console.log('🎬 Starting render process...');

        // 1. Bundle the Remotion project
        // Note: In production, you might want to bundle once and cache it.
        const entryPoint = path.resolve('./src/remotion/index.ts');
        console.log('📦 Bundling...', entryPoint);

        const bundleLocation = await bundle({
            entryPoint,
            // 로컬 개발 환경 최적화
            webpackOverride: (config) => config,
        });

        // 2. Get composition details to calculate duration/metadata
        const compositions = await getCompositions(bundleLocation, {
            inputProps: { segments }, // 실제 데이터 주입
        });

        const composition = compositions.find((c) => c.id === compositionId);
        if (!composition) {
            return NextResponse.json({ error: `Composition ${compositionId} not found` }, { status: 404 });
        }

        // 전체 길이 계산 (프레임 단위)
        const totalDurationInFrames = segments.reduce((acc: number, seg: any) => {
            return acc + Math.max(Math.floor((seg.duration || 3) * 30), 1);
        }, 0);

        console.log(`⏱️ Rendering ${totalDurationInFrames} frames...`);

        // 3. Render the video
        const tempOutput = path.join(os.tmpdir(), `autovideo-${Date.now()}.mp4`);

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: 'h264',
            outputLocation: tempOutput,
            inputProps: { segments },
            // durationInFrames: totalDurationInFrames || 300, // composition에서 정의됨, 필요시 오버라이드
            // fps: 30, // Removed to fix type error
            // 진행 상황 로깅 (옵션)
            onProgress: (p) => {
                if (p.progress % 0.1 < 0.01) console.log(`Rendering: ${Math.round(p.progress * 100)}%`);
            },
        });

        console.log('✅ Render completed:', tempOutput);

        // 4. Stream the file back to the client
        const fileBuffer = fs.readFileSync(tempOutput);

        // Clean up temp file
        // fs.unlinkSync(tempOutput); // 바로 삭제하면 스트리밍 문제 발생 가능성 있음, 일단 유지하거나 나중에 삭제

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="autovideo-render.mp4"`,
            },
        });

    } catch (error: any) {
        console.error('❌ Render error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
