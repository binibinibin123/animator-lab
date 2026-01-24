// Database types generated from Supabase schema
// Run `npx supabase gen types typescript` to regenerate

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    public: {
        Tables: {
            channels: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    type: string | null;
                    visual_persona_url: string | null;
                    style_preset: string | null;
                    voice_id: string | null;
                    topic_source: string | null;
                    rss_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    type?: string | null;
                    visual_persona_url?: string | null;
                    style_preset?: string | null;
                    voice_id?: string | null;
                    topic_source?: string | null;
                    rss_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    type?: string | null;
                    visual_persona_url?: string | null;
                    style_preset?: string | null;
                    voice_id?: string | null;
                    topic_source?: string | null;
                    rss_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            projects: {
                Row: {
                    id: string;
                    channel_id: string | null; // NEW
                    is_test_run: boolean; // NEW
                    title: string;
                    topic: string;
                    aspect_ratio: string;
                    style: string;
                    status: string;
                    duration: number;
                    video_provider: string;
                    video_url: string | null;
                    thumbnail_url: string | null;
                    autopilot_status: string | null;
                    autopilot_progress: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    channel_id?: string | null;
                    is_test_run?: boolean;
                    title: string;
                    topic: string;
                    aspect_ratio?: string;
                    style?: string;
                    status?: string;
                    duration?: number;
                    video_provider?: string;
                    video_url?: string | null;
                    thumbnail_url?: string | null;
                    autopilot_status?: string | null;
                    autopilot_progress?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    channel_id?: string | null;
                    is_test_run?: boolean;
                    title?: string;
                    topic?: string;
                    aspect_ratio?: string;
                    style?: string;
                    status?: string;
                    duration?: number;
                    video_provider?: string;
                    video_url?: string | null;
                    thumbnail_url?: string | null;
                    autopilot_status?: string | null;
                    autopilot_progress?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            segments: {
                Row: {
                    id: string;
                    project_id: string;
                    order_index: number;
                    script_text: string;
                    audio_url: string | null;
                    image_url: string | null;
                    video_url: string | null;
                    upscaled_video_url: string | null;
                    visual_description: string | null;
                    duration_ms: number | null;
                    video_provider_override: string | null;
                    video_prompt: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    project_id: string;
                    order_index: number;
                    script_text: string;
                    audio_url?: string | null;
                    image_url?: string | null;
                    video_url?: string | null;
                    upscaled_video_url?: string | null;
                    visual_description?: string | null;
                    duration_ms?: number | null;
                    video_provider_override?: string | null;
                    video_prompt?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    project_id?: string;
                    order_index?: number;
                    script_text?: string;
                    audio_url?: string | null;
                    image_url?: string | null;
                    video_url?: string | null;
                    upscaled_video_url?: string | null;
                    visual_description?: string | null;
                    duration_ms?: number | null;
                    video_provider_override?: string | null;
                    video_prompt?: string | null;
                    created_at?: string;
                };
            };
            video_jobs: {
                Row: {
                    id: string;
                    segment_id: string;
                    external_job_id: string | null;
                    provider: string;
                    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress: number;
                    output_url: string | null;
                    error: string | null;
                    created_at: string;
                    started_at: string | null;
                    finished_at: string | null;
                };
                Insert: {
                    id?: string;
                    segment_id: string;
                    external_job_id?: string | null;
                    provider: string;
                    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress?: number;
                    output_url?: string | null;
                    error?: string | null;
                    created_at?: string;
                    started_at?: string | null;
                    finished_at?: string | null;
                };
                Update: {
                    id?: string;
                    segment_id?: string;
                    external_job_id?: string | null;
                    provider?: string;
                    status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress?: number;
                    output_url?: string | null;
                    error?: string | null;
                    created_at?: string;
                    started_at?: string | null;
                    finished_at?: string | null;
                };
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
};

export type Channel = Database['public']['Tables']['channels']['Row'];
export type ChannelInsert = Database['public']['Tables']['channels']['Insert'];
export type ChannelUpdate = Database['public']['Tables']['channels']['Update'];

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type Segment = Database['public']['Tables']['segments']['Row'];
export type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
export type VideoJob = Database['public']['Tables']['video_jobs']['Row'];
export type VideoJobInsert = Database['public']['Tables']['video_jobs']['Insert'];
export type VideoJobStatus = VideoJob['status'];
