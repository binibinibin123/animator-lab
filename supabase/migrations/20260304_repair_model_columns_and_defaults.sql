-- Repair migration for environments that missed prior model-related migrations
-- Safe to run multiple times.

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS image_model text,
ADD COLUMN IF NOT EXISTS video_model text,
ADD COLUMN IF NOT EXISTS pricing_version text,
ADD COLUMN IF NOT EXISTS render_strategy text;

ALTER TABLE public.projects
ALTER COLUMN image_model SET DEFAULT 'nano-banana-2',
ALTER COLUMN video_model SET DEFAULT 'ltx-2-fast',
ALTER COLUMN pricing_version SET DEFAULT 'v1',
ALTER COLUMN render_strategy SET DEFAULT 'native';

UPDATE public.projects
SET image_model = COALESCE(image_model, 'nano-banana-2'),
    video_model = COALESCE(video_model, 'ltx-2-fast'),
    pricing_version = COALESCE(pricing_version, 'v1'),
    render_strategy = COALESCE(render_strategy, 'native');

ALTER TABLE public.segments
ADD COLUMN IF NOT EXISTS image_model text,
ADD COLUMN IF NOT EXISTS video_model text,
ADD COLUMN IF NOT EXISTS last_quote_credits integer;
