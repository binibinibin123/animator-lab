
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env.local parsing
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            const cleanValue = value.replace(/"/g, '').replace(/'/g, '').trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = cleanValue;
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = cleanValue;
        }
    });
} else {
    console.error('.env.local not found at', envPath);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    console.log('Checking projects on:', supabaseUrl);

    const { data, error, count } = await supabase
        .from('projects')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    console.log(`Found ${count} projects.`);
    if (data && data.length > 0) {
        console.log('First 5 projects:');
        data.slice(0, 5).forEach(p => {
            console.log(`- [${p.id}] ${p.title} (${p.status}, created: ${p.created_at})`);
        });
    } else {
        console.log('No projects found. This DB is empty.');
    }

    // Check segments simply to be sure
    const { count: segmentCount } = await supabase.from('segments').select('*', { count: 'exact', head: true });
    console.log(`Total segments: ${segmentCount}`);
}

checkProjects();
