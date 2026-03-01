// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import { generateTTS, getAvailableVoices, DEFAULT_VOICES } from '@/lib/ai/elevenlabs';
import { finalizeCredits, releaseReservedCredits, reserveCredits } from '@/lib/credits/ledger';
import { DEFAULT_TTS_MODEL_ID, loadPricingContext, quoteTtsCreditsWithContext } from '@/lib/credits/pricing';

// POST /api/tts/generate - Generate TTS audio
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voiceId, segmentId, projectId } = body;

        console.log('[TTS] Request:', { text: text?.substring(0, 50), voiceId, segmentId, projectId });

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // Generate TTS - use provided voiceId or default
        const voice = voiceId || DEFAULT_VOICES[0].voiceId;
        console.log('[TTS] Using voice:', voice);

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
            return NextResponse.json(
                { error: 'projectId or segmentId is required for TTS billing' },
                { status: 400 }
            );
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
                    voiceId: voice,
                    source: '/api/tts/generate',
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
            const result = await generateTTS(text, voice);
            console.log('[TTS] Generation result:', { durationMs: result.durationMs, bufferSize: result.audioBuffer?.length });

            const fileName = `audio_${Date.now()}.mp3`;

            console.log('[TTS] Uploading to Supabase:', fileName);

            const { error: uploadError } = await supabase
                .storage
                .from('autovideo-media')
                .upload(`audio/${fileName}`, result.audioBuffer, {
                    contentType: 'audio/mpeg',
                });

            if (uploadError) {
                console.error('[TTS] Upload error:', uploadError);
                throw uploadError;
            }

            const { data: urlData } = supabase
                .storage
                .from('autovideo-media')
                .getPublicUrl(`audio/${fileName}`);

            const audioUrl = urlData.publicUrl;
            console.log('[TTS] Audio URL:', audioUrl);

            if (segmentId) {
                const { error: updateError } = await supabase
                    .from('segments')
                    .update({ audio_url: audioUrl, duration_ms: result.durationMs })
                    .eq('id', segmentId);

                if (updateError) {
                    console.error('[TTS] Segment update error:', updateError);
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
                        voiceId: voice,
                        source: '/api/tts/generate',
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
        } catch (generationError) {
            if (ttsQuote.quoteCredits > 0) {
                await releaseReservedCredits({
                    supabase,
                    operationId,
                    projectId: resolvedProjectId,
                    modelId: ttsQuote.modelId,
                    pricingVersion,
                    details: {
                        segmentId: segmentId || null,
                        reason: 'tts_generate_failed',
                        source: '/api/tts/generate',
                    },
                });
            }

            throw generationError;
        }
    } catch (error: any) {
        console.error('[TTS] Generation error:', error);
        console.error('[TTS] Error details:', error?.message, error?.stack);
        return NextResponse.json(
            { error: 'Failed to generate TTS', details: error?.message },
            { status: 500 }
        );
    }
}

// GET /api/tts/generate - Get available voices (dynamic from ElevenLabs)
export async function GET() {
    try {
        console.log('[TTS] Fetching voices...');
        const voices = await getAvailableVoices();
        console.log('[TTS] Fetched', voices.length, 'voices');
        return NextResponse.json({ voices });
    } catch (error) {
        console.error('[TTS] Failed to fetch voices:', error);
        return NextResponse.json({ voices: DEFAULT_VOICES });
    }
}
