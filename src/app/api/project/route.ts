// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ProjectInsert } from '@/types/database';

// GET /api/project - List all projects
export async function GET() {
    try {
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ projects: data });
    } catch (error) {
        console.error('Failed to fetch projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

// POST /api/project - Create or duplicate project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createServerClient();

        // 복제 액션
        if (body.action === 'duplicate' && body.id) {
            // 원본 프로젝트 가져오기
            const { data: original, error: fetchError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', body.id)
                .single();

            if (fetchError || !original) {
                throw new Error('Project not found');
            }

            // 새 프로젝트 생성
            const { data: newProject, error: insertError } = await supabase
                .from('projects')
                .insert({
                    title: `${original.title} (복사본)`,
                    topic: original.topic,
                    aspect_ratio: original.aspect_ratio,
                    style: original.style,
                    status: 'draft',
                    duration: original.duration,
                    video_provider: original.video_provider,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // segments 복제
            const { data: segments } = await supabase
                .from('segments')
                .select('*')
                .eq('project_id', body.id)
                .order('order_index');

            if (segments && segments.length > 0) {
                const newSegments = segments.map(seg => ({
                    project_id: newProject.id,
                    order_index: seg.order_index,
                    script_text: seg.script_text,
                    visual_description: seg.visual_description,
                }));
                await supabase.from('segments').insert(newSegments);
            }

            return NextResponse.json({ project: newProject });
        }

        // 일반 생성
        const projectData: ProjectInsert = {
            title: body.title || '새 프로젝트',
            topic: body.topic || '',
            aspect_ratio: body.aspectRatio || '16:9',
            style: body.style || 'anime',
            duration: body.duration || 60,
            status: 'settings',
            video_provider: body.videoProvider || 'fal',
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ project: data });
    } catch (error) {
        console.error('Failed to create project:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}

// DELETE /api/project?id=xxx - 프로젝트 삭제
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    try {
        const supabase = createServerClient();

        // segments 먼저 삭제
        await supabase.from('segments').delete().eq('project_id', projectId);

        // project 삭제
        const { error } = await supabase.from('projects').delete().eq('id', projectId);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH /api/project - 프로젝트 이름 변경
export async function PATCH(request: NextRequest) {
    try {
        const { id, title } = await request.json();

        if (!id || !title) {
            return NextResponse.json({ error: 'ID and title required' }, { status: 400 });
        }

        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('projects')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ project: data });
    } catch (error: any) {
        console.error('Update project error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
