import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * Handle segment administrative actions (Split, Merge, Delete)
 * Uses JS-based shifting for maximum compatibility without needing SQL Functions (RPC)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, segmentId } = body;
        const supabase = createServerClient();

        if (!segmentId) {
            return NextResponse.json({ error: 'segmentId is required' }, { status: 400 });
        }

        const { data: segment, error: fetchError } = await supabase
            .from('segments')
            .select('*')
            .eq('id', segmentId)
            .single();

        if (fetchError || !segment) {
            return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
        }

        if (action === 'split') {
            const { splitIndex } = body;
            if (splitIndex === undefined) {
                return NextResponse.json({ error: 'splitIndex is required for split' }, { status: 400 });
            }

            const textA = segment.script_text.substring(0, splitIndex).trim();
            const textB = segment.script_text.substring(splitIndex).trim();

            if (!textB) {
                return NextResponse.json({ error: 'Cannot split at the end of text' }, { status: 400 });
            }

            // A. Update current segment
            await supabase
                .from('segments')
                .update({
                    script_text: textA,
                    audio_url: null,
                    image_url: null,
                    video_url: null,
                    duration_ms: null
                } as never)
                .eq('id', segmentId);

            // B. Shift all subsequent segments (+1)
            const { data: laterSegments } = await supabase
                .from('segments')
                .select('id, order_index')
                .eq('project_id', segment.project_id)
                .gt('order_index', segment.order_index)
                .order('order_index', { ascending: false });

            if (laterSegments) {
                for (const s of laterSegments) {
                    await supabase
                        .from('segments')
                        .update({ order_index: s.order_index + 1 } as never)
                        .eq('id', s.id);
                }
            }

            // C. Insert new segment with Text B
            const { data: newSegment, error: insertError } = await supabase
                .from('segments')
                .insert({
                    project_id: segment.project_id,
                    order_index: segment.order_index + 1,
                    script_text: textB
                } as never)
                .select()
                .single();

            if (insertError) throw insertError;

            return NextResponse.json({ success: true, action: 'split', newSegment });

        } else if (action === 'merge') {
            const { data: nextSegment } = await supabase
                .from('segments')
                .select('*')
                .eq('project_id', segment.project_id)
                .eq('order_index', segment.order_index + 1)
                .single();

            if (!nextSegment) {
                return NextResponse.json({ error: 'Next segment not found to merge' }, { status: 400 });
            }

            const combinedText = (segment.script_text + ' ' + nextSegment.script_text).trim();

            // A. Update current segment
            await supabase
                .from('segments')
                .update({
                    script_text: combinedText,
                    audio_url: null,
                    image_url: null,
                    video_url: null,
                    duration_ms: null
                } as never)
                .eq('id', segmentId);

            // B. Delete the next segment
            await supabase
                .from('segments')
                .delete()
                .eq('id', nextSegment.id);

            // C. Shift subsequent segments back (-1)
            const { data: followingSegments } = await supabase
                .from('segments')
                .select('id, order_index')
                .eq('project_id', segment.project_id)
                .gt('order_index', nextSegment.order_index)
                .order('order_index', { ascending: true });

            if (followingSegments) {
                for (const s of followingSegments) {
                    await supabase
                        .from('segments')
                        .update({ order_index: s.order_index - 1 } as never)
                        .eq('id', s.id);
                }
            }

            return NextResponse.json({ success: true, action: 'merge' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Segment API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const segmentId = searchParams.get('segmentId');
        const supabase = createServerClient();

        if (!segmentId) {
            return NextResponse.json({ error: 'segmentId is required' }, { status: 400 });
        }

        const { data: segment, error: fetchError } = await supabase
            .from('segments')
            .select('*')
            .eq('id', segmentId)
            .single();

        if (fetchError || !segment) {
            return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
        }

        // A. Delete
        await supabase.from('segments').delete().eq('id', segmentId);

        // B. Shift all subsequent segments back (-1)
        const { data: laterSegments } = await supabase
            .from('segments')
            .select('id, order_index')
            .eq('project_id', segment.project_id)
            .gt('order_index', segment.order_index)
            .order('order_index', { ascending: true });

        if (laterSegments) {
            for (const s of laterSegments) {
                await supabase
                    .from('segments')
                    .update({ order_index: s.order_index - 1 } as never)
                    .eq('id', s.id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Segment Delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
