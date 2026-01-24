
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = process.env.TELEGRAM_USER_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN is missing in .env.local');
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials missing during bot startup.');
    process.exit(1);
}

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Bot (Polling Mode)
const bot = new TelegramBot(token, { polling: true });

// Notification State
const notifiedProjects = new Set<string>();

// Initialize and Start Polling
async function startBot() {
    console.log('🤖 AutoVideo Bot is running...');

    // 1. Initial Load: Mark existing completed projects as 'notified' to avoid spam on restart
    const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .not('video_url', 'is', null);

    if (existing) {
        existing.forEach(p => notifiedProjects.add(p.id));
        console.log(`[Bot] Loaded ${existing.length} already completed projects.`);
    }

    // 2. Poll for new completions every 30 seconds
    setInterval(checkCompletions, 30000);
}

startBot();

// Loop Function
async function checkCompletions() {
    if (!allowedUserId) return;

    try {
        const { data: projects } = await supabase
            .from('projects')
            .select('id, title, video_url, is_test_run')
            .not('video_url', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(10); // Check recent only

        if (!projects) return;

        for (const p of projects) {
            if (!notifiedProjects.has(p.id)) {
                // New Completion!
                notifiedProjects.add(p.id);

                const typeLabel = p.is_test_run ? '🧪 Test Run' : '⚡ Project';
                const msg = `✅ **${typeLabel} Completed!**\n\n**${p.title}**\n\n🎥 Video: ${p.video_url}`;

                bot.sendMessage(allowedUserId, msg, { parse_mode: 'Markdown' });
                console.log(`[Bot] Sent notification for ${p.id}`);
            }
        }
    } catch (e) {
        console.error('[Bot] Polling Error:', e);
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id.toString();

    console.log(`[Bot] Received message from ${userId}: ${msg.text}`);

    // Security Check
    if (userId !== allowedUserId) {
        if (allowedUserId) {
            bot.sendMessage(chatId, '⛔ Access Denied. You are not the owner of this bot.');
            console.warn(`[Bot] Blocked unauthorized user: ${userId}`);
        } else {
            bot.sendMessage(chatId, '⚠️ Setup Warning: TELEGRAM_USER_ID is not set in env. Anyone can access this bot.');
        }
        // If strict security needed, return here. 
        // For dev convenience, if ID not set, maybe allow? 
        // Let's enforce strictness if the var exists, but warn if missing.
        if (allowedUserId && userId !== allowedUserId) return;
    }

    // Handle "/start"
    if (msg.text === '/start') {
        bot.sendMessage(chatId, '👋 Hello! I am your AutoVideo assistant.\nSend any message to check current project status.');
        return;
    }

    // Handle Status
    try {
        await handleStatusCheck(chatId);
    } catch (error: any) {
        console.error('[Bot] Error handling status:', error);
        bot.sendMessage(chatId, '❌ Error checking status: ' + error.message);
    }
});

async function handleStatusCheck(chatId: number) {
    // 1. Fetch Active Projects
    // We consider 'active' as any project created in the last 24 hours 
    // OR status is explicitly 'processing'/'script'/'voice'/'image'
    // To avoid spamming old abandoned projects, let's filter by updated_at > 24h ago? 
    // For now, let's stick to status checks but calculate real progress.

    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'completed')
        .neq('status', 'draft')
        .neq('status', 'settings')
        .order('updated_at', { ascending: false }) // Prioritize recently active
        .limit(10); // Limit to top 10 to avoid hitting limits

    if (error) throw error;

    if (!projects || projects.length === 0) {
        bot.sendMessage(chatId, '💤 No active projects found.');
        return;
    }

    let report = `🎬 **Project Status Report**\n\n`;

    for (const project of projects) {
        // Fetch segments stats
        const { data: segments } = await supabase
            .from('segments')
            .select('id, audio_url, image_url, video_url')
            .eq('project_id', project.id);

        const total = segments ? segments.length : 0;
        if (total === 0) continue; // Skip empty projects

        const voiceCount = segments?.filter(s => s.audio_url).length || 0;
        const imageCount = segments?.filter(s => s.image_url).length || 0;
        const videoCount = segments?.filter(s => s.video_url).length || 0;

        // Derive Real Status
        let displayStatus = '📝 Writing Script';
        let progressStr = '';
        let pct = 0;

        // Priority: Project Video -> Segment Video -> Segment Image -> Segment Voice
        if (project.video_url) {
            displayStatus = '✅ Video Completed';
            pct = 100;
        } else if (videoCount > 0) {
            displayStatus = '🎥 Generating Video Clips';
            progressStr = `${videoCount}/${total}`;
            pct = Math.round((videoCount / total) * 100);
        } else if (imageCount > 0) {
            displayStatus = '🖼️ Generating Images';
            progressStr = `${imageCount}/${total}`;
            pct = Math.round((imageCount / total) * 100);

            // If Images are done but no videos yet
            if (imageCount === total && total > 0) {
                displayStatus = '🖼️ Images Completed';
            }
        } else if (voiceCount > 0) {
            displayStatus = '🎙️ Generating Voice';
            progressStr = `${voiceCount}/${total}`;
            pct = Math.round((voiceCount / total) * 100);
        }

        // Add to report
        report += `🔹 **${project.title}**\n`;
        report += `   ${displayStatus} ${progressStr} (${pct}%)\n`;
        report += `   Mode: ${project.is_test_run ? '🧪 Test' : '⚡ Auto'}\n\n`;
    }

    bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
}
