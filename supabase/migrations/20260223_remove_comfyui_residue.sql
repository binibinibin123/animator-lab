-- Remove ComfyUI-specific schema residues after provider simplification

ALTER TABLE segments
DROP COLUMN IF EXISTS upscaled_video_url,
DROP COLUMN IF EXISTS video_provider_override;

-- Keep existing rows valid if legacy constraint still allows comfyui
ALTER TABLE video_jobs
DROP CONSTRAINT IF EXISTS video_jobs_provider_check;

-- Normalize legacy rows before enforcing single-provider constraint
UPDATE video_jobs
SET provider = 'fal'
WHERE provider IS DISTINCT FROM 'fal';

ALTER TABLE video_jobs
ADD CONSTRAINT video_jobs_provider_check CHECK (provider IN ('fal'));
