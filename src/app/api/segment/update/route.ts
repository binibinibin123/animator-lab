// Segment Update API - for updating segment fields like video_url
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { segmentId, ...updateFields } = body;

        if (!segmentId) {
            return NextResponse.json(
                { error: 'segmentId is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();
        const { data, error } = await supabase
            .from('segments')
            .update(updateFields as never)
            .eq('id', segmentId)
            .select()
            .single();

        if (error) {
            console.error('Segment update error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, segment: data });
    } catch (error) {
        console.error('Segment update error:', error);
        return NextResponse.json(
            { error: 'Failed to update segment' },
            { status: 500 }
        );
    }
}
