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

// POST /api/project - Create a new project
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createServerClient();

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
