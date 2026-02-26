import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { projectId, type } = await req.json();

        if (!projectId || !type) {
            return NextResponse.json({ error: 'Missing projectId or type' }, { status: 400 });
        }

        const supabase = createServerClient(); // Uses service key for admin access

        let updateData = {};
        if (type === 'video') {
            updateData = { video_url: null };
        } else if (type === 'image') {
            updateData = { image_url: null };
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const { error } = await supabase
            .from('segments')
            .update(updateData as never)
            .eq('project_id', projectId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, message: `All ${type}s reset successfully` });

    } catch (error: any) {
        console.error('Reset Media Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reset media' },
            { status: 500 }
        );
    }
}
