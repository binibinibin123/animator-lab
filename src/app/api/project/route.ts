// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ProjectInsert } from '@/types/database';
import { generateScript, generateTopic } from '@/lib/ai/gemini';
import Parser from 'rss-parser';

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

        // ---------------------------------------------------------
        // 1. Channel Automation / Test Run Logic
        // ---------------------------------------------------------
        if (body.channel_id || body.isTestRun) {
            console.log('[CreateProject] Starting Automation. Channel:', body.channel_id, 'TestRun:', body.isTestRun);

            let topic = body.topic;
            let style = body.style || 'economy-1';
            let duration = body.duration || 60;
            let referenceSample = undefined;
            let channel = null;

            // Fetch Channel Info if exists
            if (body.channel_id) {
                const { data: ch, error: chErr } = await supabase
                    .from('channels')
                    .select('*')
                    .eq('id', body.channel_id)
                    .single();

                if (ch && !chErr) {
                    channel = ch;
                    style = ch.style_preset || style;

                    // A. Tone Cloning (Fetch reference from ANY previous project of this channel)
                    // Try to find a project with segments
                    const { data: refProjects } = await supabase
                        .from('projects')
                        .select('*, segments(*)')
                        .eq('channel_id', body.channel_id)
                        .order('created_at', { ascending: true }) // Oldest first (original style)
                        .limit(1);

                    if (refProjects && refProjects.length > 0 && refProjects[0].segments?.length > 0) {
                        referenceSample = refProjects[0].segments.map((s: any) => s.script_text).join(' ');
                        console.log('[CreateProject] Found reference matching channel tone.');
                    }

                    // B. Topic Source
                    if (!topic) {
                        if (channel.topic_source === 'rss' && channel.rss_url) {
                            try {
                                const parser = new Parser();
                                const feed = await parser.parseURL(channel.rss_url);
                                if (feed.items && feed.items.length > 0) {
                                    const item = feed.items[0];
                                    topic = `News: ${item.title}. \nContent: ${item.contentSnippet?.slice(0, 200) || ''}`;
                                    console.log('[CreateProject] Fetched RSS Topic:', topic.slice(0, 50));
                                }
                            } catch (e) {
                                console.error('[CreateProject] RSS Error:', e);
                                topic = 'AI Automation News'; // Fallback
                            }
                        } else if (channel.topic_source === 'random') {
                            topic = await generateTopic(channel.description || 'General Tech');
                            console.log('[CreateProject] Generated Random Topic:', topic);
                        }
                    }
                }
            }

            // Fallback topic
            if (!topic) topic = "The Future of AI Video";

            // Generate Script
            console.log(`[CreateProject] Generating script... Topic: ${topic}, Style: ${style}`);
            const scriptResult = await generateScript(
                topic,
                duration,
                style,
                'ko',
                'finance', // Persona (TODO: add persona to channel)
                referenceSample,
                body.isTestRun // Force 6s if test run
            );

            // Create Project Record
            const projectData: ProjectInsert = {
                channel_id: body.channel_id || null, // Ensure explicit null if undefined
                is_test_run: body.isTestRun || false,
                title: scriptResult.title || topic,
                topic: topic,
                style: style,
                aspect_ratio: '9:16', // Shorts default
                duration: scriptResult.totalDurationMs / 1000,
                status: 'script', // Ready for TTS/Image
                video_provider: 'fal',
                autopilot_status: 'generating',
                autopilot_progress: 20
            };

            const { data: newProject, error: projErr } = await supabase
                .from('projects')
                .insert(projectData)
                .select()
                .single();

            if (projErr) throw projErr;

            // Insert Segments
            const segmentsToInsert = scriptResult.segments.map((seg, idx) => ({
                project_id: newProject.id,
                order_index: idx,
                script_text: seg.text,
                visual_description: seg.visual,
                duration_ms: seg.estimatedDurationMs,
                created_at: new Date().toISOString()
            }));

            const { error: segErr } = await supabase.from('segments').insert(segmentsToInsert);
            if (segErr) throw segErr;

            console.log('[CreateProject] Automation Complete. Project ID:', newProject.id);
            return NextResponse.json({ project: newProject, generated: true });
        }


        // ---------------------------------------------------------
        // 2. Duplicate Logic (Existing)
        // ---------------------------------------------------------
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


        // ---------------------------------------------------------
        // 3. Manual Creation (Existing)
        // ---------------------------------------------------------
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
    } catch (error: any) {
        console.error('Failed to create project:', error);
        return NextResponse.json(
            { error: 'Failed to create project', details: error.message },
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
