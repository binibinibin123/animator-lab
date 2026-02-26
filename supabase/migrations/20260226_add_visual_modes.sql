-- Add visual mode fields for character/style consistency
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS visual_mode text NOT NULL DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS character_reference_url text,
ADD COLUMN IF NOT EXISTS style_reference_url text,
ADD COLUMN IF NOT EXISTS style_text text;

-- Enforce allowed visual mode values
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_visual_mode_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_visual_mode_check
CHECK (visual_mode IN ('legacy', 'character_fixed', 'style_fixed'));

-- Security hardening: block public uploads to autovideo-media
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
