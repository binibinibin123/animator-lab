import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // or SERVICE_ROLE if available, but ANON is safer to test client-like behavior

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Starting Phase 3 Integration Verification ---');

    // 1. Create Test Channel
    const channelName = `Backend Test Channel ${Date.now()}`;
    console.log(`1. Creating Channel: ${channelName}`);

    const { data: channel, error: chErr } = await supabase
        .from('channels')
        .insert({
            name: channelName,
            description: 'A test channel for verifying random topic generation.',
            style_preset: 'economy-1',
            voice_id: 'JBFqnCBsd6RMkjVDRZzb', // George
            topic_source: 'random'
        })
        .select()
        .single();

    if (chErr) {
        console.error('Channel Creation Failed:', chErr);
        process.exit(1);
    }
    console.log(`   -> Channel Created: ${channel.id}`);

    // 2. Trigger Auto-Generate (Call Internal API)
    console.log('2. Triggering Auto-Generate (API Call)...');

    // We can't easily fetch localhost from this script if headers/cookies are needed, 
    // but the API is public-ish. Let's try fetching the running dev server.
    const apiUrl = 'http://localhost:3000/api/project';

    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel_id: channel.id,
                duration: 30, // 30s
                isTestRun: false
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('API Call Failed:', data);
            process.exit(1);
        }

        console.log(`   -> API Response: Success. Project ID: ${data.project?.id}`);
        console.log(`   -> Topic Generated: "${data.project?.topic}"`);

        // 3. Verify Project Details
        if (data.project.topic === 'The Future of AI Video') {
            console.warn('   WARNING: Fallback topic used. Random generation might have failed or Gemini unavailable.');
        } else {
            console.log('   SUCCESS: Random topic generation appears to have worked.');
        }

        console.log('--- Verification Complete ---');

    } catch (e: any) {
        console.error('Fetch Error:', e.cause || e);
        console.log('Ensure the dev server is running on port 3000.');
    }
}

main();
