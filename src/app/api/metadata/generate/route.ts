import { NextRequest, NextResponse } from 'next/server';
import { generateRawText } from '@/lib/ai/gemini';
import { getRealTags } from '@/lib/youtube-tags';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, scriptText, mode = 'all' } = body;

        console.log(`[Metadata API] Generating ${mode} for project:`, projectId);

        if (!projectId || !scriptText) {
            return NextResponse.json({ error: 'Missing projectId or scriptText' }, { status: 400 });
        }

        // 1. Language Detection (Strict)
        const koreanCharCount = (scriptText.match(/[가-힣]/g) || []).length;
        const totalCharCount = scriptText.length;
        const isKorean = (koreanCharCount / totalCharCount) > 0.1;
        const targetLang = isKorean ? 'Korean' : 'English';

        let resultMetadata: any = {};

        // 2. Logic Split based on Mode
        if (mode === 'all' || mode === 'titles' || mode === 'description') {
            // Generate Titles/Description via LLM
            const prompt = `
                You are a YouTube Marketing Expert specializing in "Loss Aversion" psychology.
                Analyze the script and generate viral metadata.
                
                LANGUAGE: ${targetLang.toUpperCase()} ONLY.
                TASKS:
                ${(mode === 'all' || mode === 'titles') ? `- Generate 5 Provocative Titles (Loss Aversion, FOMO).` : ''}
                ${(mode === 'all' || mode === 'description') ? `- Generate a hook-heavy 3-sentence Description.` : ''}

                INPUT SCRIPT:
                ${scriptText.slice(0, 1000)}...

                OUTPUT FORMAT (JSON only):
                {
                    ${(mode === 'all' || mode === 'titles') ? `"titles": ["Title 1", ...],` : ''}
                    ${(mode === 'all' || mode === 'description') ? `"description": "Description text...",` : ''}
                    ${mode === 'all' ? `"seed_keywords": ["A", "B"]` : ''} 
                }
            `;

            const jsonStr = await generateRawText(prompt);
            const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(cleanJson);

            if (aiData.titles) resultMetadata.titles = aiData.titles;
            if (aiData.description) resultMetadata.description = aiData.description;
            if (aiData.seed_keywords) resultMetadata.seed_keywords = aiData.seed_keywords;
        }

        // 3. Tags Generation (Separate Logic involved)
        if (mode === 'all' || mode === 'tags') {
            let seedKeywords = resultMetadata.seed_keywords;

            // If we didn't get seeds from the previous step (e.g. mode='tags' only), ask LLM for seeds now
            if (!seedKeywords) {
                const seedPrompt = `
                    Analyze script and extract 5 broad "Seed Keywords" for YouTube Search.
                    LANGUAGE: ${targetLang}
                    SCRIPT: ${scriptText.slice(0, 500)}...
                    OUTPUT JSON: { "seed_keywords": ["k1", "k2", "k3", "k4", "k5"] }
                `;
                const seedJson = await generateRawText(seedPrompt);
                try {
                    seedKeywords = JSON.parse(seedJson.replace(/```json/g, '').replace(/```/g, '').trim()).seed_keywords;
                } catch (e) {
                    seedKeywords = [isKorean ? '투자' : 'Investment']; // Fallback
                }
            }

            console.log('[Metadata API] Fetching real tags for seeds:', seedKeywords);

            let realTags: string[] = [];
            if (seedKeywords && Array.isArray(seedKeywords)) {
                const promises = seedKeywords.map((seed: string) => getRealTags(seed, targetLang));
                const results = await Promise.all(promises);
                const allTags = results.flat();
                realTags = Array.from(new Set(allTags)).slice(0, 15);
            }
            resultMetadata.tags = realTags.join(', ');
        }

        // 4. Save to DB (Persistence Fix)
        const supabase = createServerClient();

        // Fetch existing metadata first to merge if necessary (e.g. if partial update)
        let newMetadata = resultMetadata;

        if (mode !== 'all') {
            const { data: currentProject } = await supabase
                .from('projects')
                .select('youtube_metadata')
                .eq('id', projectId)
                .single();

            const existingMetadata = (currentProject as any)?.youtube_metadata || {};
            newMetadata = { ...existingMetadata, ...resultMetadata };
        }

        // Persist metadata on project row
        const { error } = await supabase
            .from('projects')
            .update({ youtube_metadata: newMetadata } as never)
            .eq('id', projectId);

        if (error) {
            console.error('[Metadata API] DB Update Error:', error);
            // Don't fail the request, just log it, but user warned so maybe we should return it?
            // proceeding to return metadata anyway so UI updates
        } else {
            console.log('[Metadata API] Successfully saved metadata to DB');
        }

        return NextResponse.json({ metadata: resultMetadata });

    } catch (error: any) {
        console.error('[Metadata API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
