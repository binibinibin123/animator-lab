// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = createServerClient();
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return NextResponse.json({ settings: data || null });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createServerClient();

        // Check if settings exist
        const { data: existing } = await supabase
            .from('user_settings')
            .select('id')
            .single();

        let result;
        if (existing) {
            result = await supabase
                .from('user_settings')
                .update({
                    ...body,
                    updated_at: new Date().toISOString()
                } as never)
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('user_settings')
                .insert({
                    ...body
                } as never)
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ settings: result.data });
    } catch (error) {
        console.error('Settings POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
