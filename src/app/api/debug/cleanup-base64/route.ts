import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST /api/debug/cleanup-base64
// Scans segments for base64 image_urls, uploads them to storage, and updates the DB.
export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();

        // 1. Find ONE segment with base64 image (processing one by one avoids timeout)
        const { data: segments, error: fetchError } = await supabase
            .from('segments')
            .select('id, image_url, project_id')
            .ilike('image_url', 'data:image%')
            .limit(1); // Process ONLY ONE item per request

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!segments || segments.length === 0) {
            return NextResponse.json({ message: 'No more base64 segments found. You are clean!', count: 0 });
        }

        const results = [];
        const errors = [];

        console.log(`[Cleanup] Found ${segments.length} segments with base64 images.`);

        for (const segment of segments) {
            try {
                if (!segment.image_url) continue;

                // Parse base64
                // Format: data:image/png;base64,.....
                const matches = segment.image_url.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);

                if (!matches || matches.length !== 3) {
                    errors.push({ id: segment.id, error: 'Invalid base64 format' });
                    continue;
                }

                const extension = matches[1]; // png, jpeg, etc.
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                // Generate filename
                const filename = `restored_${Date.now()}_${segment.id}.${extension}`;
                const storagePath = `images/${filename}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(storagePath, buffer, {
                        contentType: `image/${extension}`,
                        upsert: true,
                    });

                if (uploadError) {
                    throw new Error(`Storage upload failed: ${uploadError.message}`);
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('media')
                    .getPublicUrl(storagePath);

                // Update Segment
                const { error: updateError } = await supabase
                    .from('segments')
                    .update({ image_url: publicUrl } as never)
                    .eq('id', segment.id);

                if (updateError) {
                    throw new Error(`DB update failed: ${updateError.message}`);
                }

                results.push({ id: segment.id, old_length: segment.image_url.length, new_url: publicUrl });

            } catch (err: any) {
                console.error(`[Cleanup] Failed to process segment ${segment.id}:`, err);
                errors.push({ id: segment.id, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            failed: errors.length,
            results,
            errors,
            remaining: 'Unknown (run again until count is 0)',
            TIP: 'Refesh this page repeatedly until "count" is 0.'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
