-- Ensure global user settings exist in environments created from migrations.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    default_aspect_ratio text DEFAULT '16:9',
    default_style text DEFAULT 'anime',
    default_voice_id text DEFAULT 'pNInz6obpgDQGcFmaJgB',
    default_video_model text DEFAULT 'ltx-2-fast',
    default_duration integer DEFAULT 60,
    include_subtitles boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
