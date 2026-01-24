
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function dumpDb() {
    console.error('--- Projects Dump ---');
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    console.error(JSON.stringify(projects?.map(p => ({
        id: p.id.slice(0, 5),
        title: p.title.slice(0, 20),
        status: p.status,
        auto_status: p.autopilot_status,
        auto_prog: p.autopilot_progress
    })), null, 2));

    console.error('\n--- Segments Sample (Latest Project) ---');
    if (projects && projects.length > 0) {
        const pid = projects[0].id;
        const { data: segments } = await supabase
            .from('segments')
            .select('id, script_text, audio_url, image_url')
            .eq('project_id', pid);

        console.error(`Project: ${projects[0].title} (${pid})`);
        console.error(JSON.stringify(segments?.map(s => ({
            id: s.id.slice(0, 5),
            text: s.script_text?.slice(0, 10),
            has_audio: !!s.audio_url,
            has_image: !!s.image_url
        })), null, 2));
    }
}

dumpDb();
