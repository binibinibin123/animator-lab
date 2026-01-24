
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parser
const envPath = path.resolve(process.cwd(), '.env.local');
let envVars: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^"|"$/g, '');
            envVars[key] = value;
        }
    });
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    console.log('Found keys:', Object.keys(envVars));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking "channels" table existence...');
    // Force any type to bypass TS check in script
    const { data, error } = await (supabase.from('channels') as any).select('*').limit(1);

    if (error) {
        console.error('❌ Error accessing channels table:', error.message);
        if (error.code === '42P01') {
            console.error('Reason: Table does not exist');
        }
    } else {
        console.log('✅ Success! Table "channels" exists.');
        console.log('Data count:', data.length);
    }
}

checkTable();
