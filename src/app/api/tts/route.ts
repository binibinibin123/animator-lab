// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { generateTTS, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';
import { finalizeCredits, releaseReservedCredits, reserveCredits } from '@/lib/credits/ledger';
import { DEFAULT_TTS_MODEL_ID, loadPricingContext, quoteTtsCreditsWithContext } from '@/lib/credits/pricing';

// POST /api/tts - Generate TTS audio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, segmentId, projectId } = body;

        console.log('[API /tts] Request:', { textLength: text?.length, voiceId, segmentId, projectId });

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!voiceId) {
            return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 });
        }

        const supabase = createServerClient();
        const pricingContext = await loadPricingContext(supabase);
        const pricingVersion = pricingContext.pricingVersion;

        let resolvedProjectId = typeof projectId === 'string' && projectId.trim() ? projectId : null;
        if (!resolvedProjectId && segmentId) {
            const { data: segmentRow } = await supabase
                .from('segments')
                .select('project_id')
                .eq('id', segmentId)
                .maybeSingle();
            resolvedProjectId = segmentRow?.project_id || null;
        }

        if (!resolvedProjectId) {
            return NextResponse.json({ error: 'projectId or segmentId is required for TTS billing' }, { status: 400 });
        }

        const ttsQuote = quoteTtsCreditsWithContext(pricingContext, {
            text,
            modelId: DEFAULT_TTS_MODEL_ID,
        });
        const operationId = request.headers.get('x-idempotency-key') || `tts:${resolvedProjectId}:${segmentId || randomUUID()}`;

        let reserveResult: { remainingCredits?: number; insufficient?: boolean } | null = null;
        if (ttsQuote.quoteCredits > 0) {
            reserveResult = await reserveCredits({
                supabase,
                projectId: resolvedProjectId,
                operationId,
                amount: ttsQuote.quoteCredits,
                modelId: ttsQuote.modelId,
                pricingVersion,
                details: {
                    segmentId: segmentId || null,
                    voiceId,
                    source: '/api/tts',
                    billableCharacters: ttsQuote.billableCharacters,
                },
            });

            if (reserveResult.insufficient) {
                return NextResponse.json(
                    {
                        error: 'Not enough credits for TTS generation',
                        quoteCredits: ttsQuote.quoteCredits,
                        remainingCredits: reserveResult.remainingCredits ?? 0,
                    },
                    { status: 402 }
                );
            }
        }

        try {
            // Generate TTS
            console.log('[API /tts] Generating audio...');
            const result = await generateTTS(text, voiceId || DEFAULT_VOICES[0].voiceId);
            console.log('[API /tts] Audio generated, size:', result.audioBuffer.length);

            // Supabase 디버깅
            console.log('[API /tts] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('[API /tts] Service Key set:', !!process.env.SUPABASE_SERVICE_KEY);

            // 버킷 목록 확인
            const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
            console.log('[API /tts] Available buckets:', buckets?.map(b => b.name));
            if (bucketsError) {
                console.error('[API /tts] Buckets list error:', bucketsError);
            }

            const fileName = `audio_${Date.now()}.mp3`;
            console.log('[API /tts] Uploading to bucket: autovideo-media, file:', fileName);

            const { error: uploadError } = await supabase
                .storage
                .from('autovideo-media')
                .upload(`audio/${fileName}`, result.audioBuffer, {
                    contentType: 'audio/mpeg',
                });

            if (uploadError) {
                console.error('[API /tts] Upload error:', uploadError);
                console.error('[API /tts] Upload error details:', JSON.stringify(uploadError));
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            // Get public URL
            const { data: urlData } = supabase
                .storage
                .from('autovideo-media')
                .getPublicUrl(`audio/${fileName}`);

            const audioUrl = urlData.publicUrl;
            console.log('[API /tts] Audio URL:', audioUrl);

            // Update segment if provided
            if (segmentId) {
                const { error: updateError } = await supabase
                    .from('segments')
                    .update({ audio_url: audioUrl, duration_ms: result.durationMs })
                    .eq('id', segmentId);

                if (updateError) {
                    console.error('[API /tts] Segment update error:', updateError);
                }
            }

            if (ttsQuote.quoteCredits > 0) {
                await finalizeCredits({
                    supabase,
                    operationId,
                    projectId: resolvedProjectId,
                    modelId: ttsQuote.modelId,
                    pricingVersion,
                    details: {
                        segmentId: segmentId || null,
                        voiceId,
                        source: '/api/tts',
                        billableCharacters: ttsQuote.billableCharacters,
                    },
                });
            }

            return NextResponse.json({
                success: true,
                audioUrl,
                durationMs: result.durationMs,
                quoteCredits: ttsQuote.quoteCredits,
                pricingVersion,
                pricingSource: pricingContext.source,
                remainingCredits: reserveResult?.remainingCredits,
            });
        } catch (generationError: any) {
            if (ttsQuote.quoteCredits > 0) {
                await releaseReservedCredits({
                    supabase,
                    operationId,
                    projectId: resolvedProjectId,
                    modelId: ttsQuote.modelId,
                    pricingVersion,
                    details: {
                        segmentId: segmentId || null,
                        reason: 'tts_route_failed',
                        source: '/api/tts',
                    },
                });
            }

            throw generationError;
        }
    } catch (error: any) {
        console.error('[API /tts] Error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to generate TTS', details: error?.message },
            { status: 500 }
        );
    }
}
