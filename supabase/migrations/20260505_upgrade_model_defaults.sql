-- Move MVP defaults to the current fal-hosted image/video model set.
-- Existing explicit user choices are preserved; only missing and removed legacy values are repaired.

ALTER TABLE public.projects
ALTER COLUMN image_model SET DEFAULT 'gpt-image-2',
ALTER COLUMN video_model SET DEFAULT 'ltx-2.3-fast';

UPDATE public.projects
SET image_model = 'gpt-image-2'
WHERE image_model IS NULL
   OR image_model = ''
   OR image_model = 'seedance-v1';

UPDATE public.projects
SET video_model = 'ltx-2.3-fast'
WHERE video_model IS NULL
   OR video_model = ''
   OR video_model = 'veo-3-fast';

UPDATE public.user_settings
SET default_video_model = 'ltx-2.3-fast',
    updated_at = now()
WHERE default_video_model IS NULL
   OR default_video_model = ''
   OR default_video_model IN ('seedance-v1', 'veo-3-fast', 'ltx-2-fast');
