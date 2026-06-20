-- Animator Lab production metadata and take history.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS story_bible JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS production_mode TEXT NOT NULL DEFAULT 'animation';

ALTER TABLE public.segments
  ADD COLUMN IF NOT EXISTS camera_work TEXT,
  ADD COLUMN IF NOT EXISTS action_notes TEXT,
  ADD COLUMN IF NOT EXISTS lighting_notes TEXT,
  ADD COLUMN IF NOT EXISTS emotion_notes TEXT,
  ADD COLUMN IF NOT EXISTS negative_prompt TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS public.generation_takes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  provider TEXT NOT NULL,
  model_id TEXT,
  prompt TEXT NOT NULL DEFAULT '',
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  error TEXT,
  score JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_notes TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_takes_project_id ON public.generation_takes(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_takes_segment_id ON public.generation_takes(segment_id);
CREATE INDEX IF NOT EXISTS idx_generation_takes_selected ON public.generation_takes(segment_id, media_type, is_selected);
