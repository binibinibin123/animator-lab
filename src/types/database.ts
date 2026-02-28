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
                    style_text: string | null;
                    visual_mode: 'legacy' | 'character_fixed' | 'style_fixed';
                    character_reference_url: string | null;
                    style_reference_url: string | null;
                    image_model: string;
                    video_model: string;
                    pricing_version: string;
                    status: string;
                    duration: number;
                    video_provider: string;
                    video_url: string | null;
                    thumbnail_url: string | null;
                    youtube_metadata: Json | null;
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
                    style_text?: string | null;
                    visual_mode?: 'legacy' | 'character_fixed' | 'style_fixed';
                    character_reference_url?: string | null;
                    style_reference_url?: string | null;
                    image_model?: string;
                    video_model?: string;
                    pricing_version?: string;
                    status?: string;
                    duration?: number;
                    video_provider?: string;
                    video_url?: string | null;
                    thumbnail_url?: string | null;
                    youtube_metadata?: Json | null;
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
                    style_text?: string | null;
                    visual_mode?: 'legacy' | 'character_fixed' | 'style_fixed';
                    character_reference_url?: string | null;
                    style_reference_url?: string | null;
                    image_model?: string;
                    video_model?: string;
                    pricing_version?: string;
                    status?: string;
                    duration?: number;
                    video_provider?: string;
                    video_url?: string | null;
                    thumbnail_url?: string | null;
                    youtube_metadata?: Json | null;
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
                    visual_description: string | null;
                    duration_ms: number | null;
                    video_prompt: string | null;
                    image_model: string | null;
                    video_model: string | null;
                    last_quote_credits: number | null;
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
                    visual_description?: string | null;
                    duration_ms?: number | null;
                    video_prompt?: string | null;
                    image_model?: string | null;
                    video_model?: string | null;
                    last_quote_credits?: number | null;
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
                    visual_description?: string | null;
                    duration_ms?: number | null;
                    video_prompt?: string | null;
                    image_model?: string | null;
                    video_model?: string | null;
                    last_quote_credits?: number | null;
                    created_at?: string;
                };
            };
            video_jobs: {
                Row: {
                    id: string;
                    segment_id: string;
                    external_job_id: string | null;
                    provider: string;
                    model_id: string | null;
                    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress: number;
                    quote_credits: number | null;
                    pricing_version: string | null;
                    operation_id: string | null;
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
                    model_id?: string | null;
                    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress?: number;
                    quote_credits?: number | null;
                    pricing_version?: string | null;
                    operation_id?: string | null;
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
                    model_id?: string | null;
                    status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
                    progress?: number;
                    quote_credits?: number | null;
                    pricing_version?: string | null;
                    operation_id?: string | null;
                    output_url?: string | null;
                    error?: string | null;
                    created_at?: string;
                    started_at?: string | null;
                    finished_at?: string | null;
                };
            };
            pricing_versions: {
                Row: {
                    id: string;
                    is_active: boolean;
                    config: Json;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    is_active?: boolean;
                    config?: Json;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    is_active?: boolean;
                    config?: Json;
                    created_at?: string;
                };
            };
            credit_accounts: {
                Row: {
                    id: string;
                    project_id: string;
                    balance_credits: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    project_id: string;
                    balance_credits?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    project_id?: string;
                    balance_credits?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            credit_ledger_entries: {
                Row: {
                    id: string;
                    account_id: string;
                    project_id: string;
                    operation_id: string;
                    idempotency_key: string;
                    entry_type: 'reserve' | 'finalize' | 'release' | 'topup' | 'adjustment';
                    amount_credits: number;
                    model_id: string | null;
                    pricing_version: string | null;
                    details: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    account_id: string;
                    project_id: string;
                    operation_id: string;
                    idempotency_key: string;
                    entry_type: 'reserve' | 'finalize' | 'release' | 'topup' | 'adjustment';
                    amount_credits: number;
                    model_id?: string | null;
                    pricing_version?: string | null;
                    details?: Json;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    account_id?: string;
                    project_id?: string;
                    operation_id?: string;
                    idempotency_key?: string;
                    entry_type?: 'reserve' | 'finalize' | 'release' | 'topup' | 'adjustment';
                    amount_credits?: number;
                    model_id?: string | null;
                    pricing_version?: string | null;
                    details?: Json;
                    created_at?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: {
            get_project_metadata: {
                Args: { p_id: string };
                Returns: Json;
            };
            update_project_metadata: {
                Args: { p_id: string; p_metadata: Json };
                Returns: void;
            };
        };
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
export type CreditAccount = Database['public']['Tables']['credit_accounts']['Row'];
export type CreditLedgerEntry = Database['public']['Tables']['credit_ledger_entries']['Row'];
