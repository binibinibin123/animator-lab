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
            projects: {
                Row: {
                    id: string;
                    title: string;
                    topic: string;
                    aspect_ratio: string;
                    style: string;
                    status: string;
                    duration: number;
                    video_url: string | null;
                    thumbnail_url: string | null;
                    autopilot_status: string | null;
                    autopilot_progress: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    topic: string;
                    aspect_ratio?: string;
                    style?: string;
                    status?: string;
                    duration?: number;
                    video_url?: string | null;
                    thumbnail_url?: string | null;
                    autopilot_status?: string | null;
                    autopilot_progress?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    topic?: string;
                    aspect_ratio?: string;
                    style?: string;
                    status?: string;
                    duration?: number;
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
                    visual_description: string | null;
                    duration_ms: number | null;
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
                    created_at?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
};

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type Segment = Database['public']['Tables']['segments']['Row'];
export type SegmentInsert = Database['public']['Tables']['segments']['Insert'];
