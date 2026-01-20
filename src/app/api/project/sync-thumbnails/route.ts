import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST /api/project/sync-thumbnails - Sync thumbnails for all projects
export async function POST() {
    const supabase = createServerClient();
    let updated = 0;
    let skipped = 0;

    try {
        // 1. Get all projects without thumbnails
        const { data: projects, error: projectError } = await supabase
            .from('projects')
            .select('id, thumbnail_url')
            .or('thumbnail_url.is.null,thumbnail_url.eq.');

        if (projectError) throw projectError;

        if (!projects || projects.length === 0) {
            return NextResponse.json({ message: 'No projects need thumbnail sync', updated: 0 });
        }

        // 2. For each project, get first segment's image_url
        const projectList = projects as { id: string; thumbnail_url: string | null }[];
        for (const project of projectList) {
            const { data: segment } = await supabase
                .from('segments')
                .select('image_url')
                .eq('project_id', project.id)
                .eq('order_index', 0)
                .single();

            const seg = segment as { image_url: string | null } | null;
            if (seg?.image_url) {
                // Update project thumbnail
                await supabase
                    .from('projects')
                    .update({ thumbnail_url: seg.image_url } as never)
                    .eq('id', project.id);
                updated++;
            } else {
                skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${updated} thumbnails, skipped ${skipped} projects`,
            updated,
            skipped,
        });
    } catch (error: any) {
        console.error('Sync thumbnails error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
