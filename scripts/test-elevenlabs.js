const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/ELEVENLABS_API_KEY=(.*)/);
            if (match && match[1]) {
                apiKey = match[1].trim();
            }
        }
    } catch (e) {
        console.warn('Failed to read .env.local:', e.message);
    }
}

if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY is missing');
    process.exit(1);
}

const client = new ElevenLabsClient({ apiKey });

async function test() {
    console.log(`🔑 Using API Key: ${apiKey.slice(0, 5)}...`);

    // 1. Check User Profile (Can fail)
    console.log('\n[1] Testing User Profile Read...');
    try {
        const user = await client.user.get();
        console.log(`✅ Success: ${user.subscription.tier} user`);
    } catch (error) {
        console.log(`⚠️ Failed (Profile Read): ${error.body?.detail?.status || error.message}`);
    }

    // 2. Check Voices (Can fail)
    console.log('\n[2] Testing Voice List Fetch...');
    let availableVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Default fallback (Adam)
    try {
        const response = await client.voices.getAll();
        console.log(`✅ Success: Found ${response.voices.length} voices.`);
        if (response.voices.length > 0) {
            availableVoiceId = response.voices[0].voice_id;
        }
    } catch (error) {
        console.log(`⚠️ Failed (Voice List): ${error.body?.detail?.status || error.message}`);
    }

    // 3. Check Generation (Critical)
    console.log(`\n[3] Testing Audio Generation (Voice: ${availableVoiceId})...`);
    try {
        await client.textToSpeech.convert(availableVoiceId, {
            text: 'Test message.',
            model_id: 'eleven_multilingual_v2'
        });
        console.log('✅ Success: Audio generated!');
    } catch (error) {
        console.error(`❌ Failed (Generation): ${error.body?.detail?.status || error.message}`);
        console.error('Full Error:', JSON.stringify(error.body || error, null, 2));
    }
}

test();
