import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeComfyUrl(value: string) {
    return value.replace(/\/+$/, '');
}

export async function GET() {
    const rawBaseUrl = process.env.COMFYUI_BASE_URL || '';
    const baseUrl = rawBaseUrl.trim() ? normalizeComfyUrl(rawBaseUrl.trim()) : '';

    if (!baseUrl) {
        return NextResponse.json({
            provider: 'comfyui',
            configured: false,
            online: false,
            baseUrl: null,
            message: 'COMFYUI_BASE_URL is not configured.',
        });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
        const response = await fetch(`${baseUrl}/system_stats`, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
        });

        return NextResponse.json({
            provider: 'comfyui',
            configured: true,
            online: response.ok,
            baseUrl,
            status: response.status,
        });
    } catch (error) {
        return NextResponse.json({
            provider: 'comfyui',
            configured: true,
            online: false,
            baseUrl,
            message: error instanceof Error ? error.message : 'Failed to reach ComfyUI.',
        });
    } finally {
        clearTimeout(timeout);
    }
}
