import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateScript } from '@/lib/ai/gemini';

// POST /api/script/generate - Generate script using Gemini
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { topic, duration, style, projectId } = body;

        if (!topic) {
            return NextResponse.json(
                { error: 'Topic is required' },
                { status: 400 }
            );
        }

        // Generate script using Gemini
        const result = await generateScript(topic, duration || 60, style || 'informative');

        // If projectId provided, save segments to database
        if (projectId) {
            const supabase = createServerClient();

            // Update project status
            await supabase
                .from('projects')
                .update({ status: 'script', topic })
                .eq('id', projectId);

            // Insert segments
            const segmentsToInsert = result.segments.map((seg, index) => ({
                project_id: projectId,
                order_index: index,
                script_text: seg.text,
                visual_description: seg.visual || seg.text, // Fallback to text if visual is missing
                duration_ms: seg.estimatedDurationMs,
            }));

            await supabase.from('segments').insert(segmentsToInsert);
        }

        return NextResponse.json({
            success: true,
            title: result.title,
            segments: result.segments,
            totalDurationMs: result.totalDurationMs,
        });
    } catch (error) {
        console.error('Script generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate script' },
            { status: 500 }
        );
    }
}
