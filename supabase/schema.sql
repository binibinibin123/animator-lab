-- Supabase SQL Schema for AutoVideo
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Channels table (NEW)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'youtube',
  visual_persona_url TEXT,
  style_preset TEXT DEFAULT 'anime',
  voice_id TEXT,
  topic_source TEXT DEFAULT 'manual',
  rss_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL, -- NEW
  is_test_run BOOLEAN DEFAULT false, -- NEW
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '1:1', '3:4', '9:16')),
  style TEXT DEFAULT 'anime',
  status TEXT DEFAULT 'settings' CHECK (status IN ('settings', 'script', 'voice', 'image', 'video', 'preview', 'completed')),
  duration INTEGER DEFAULT 60,
  video_url TEXT,
  thumbnail_url TEXT,
  autopilot_status TEXT, 
  autopilot_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segments table (each cut/scene in the video)
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  script_text TEXT NOT NULL,
  audio_url TEXT,
  image_url TEXT,
  video_url TEXT,
  visual_description TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  video_prompt TEXT
);

-- Index for faster segment queries
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_order ON segments(project_id, order_index);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to channels table
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for media files (run in Supabase Dashboard > Storage)
-- CREATE BUCKET IF NOT EXISTS 'autovideo-media' WITH (public = true);

-- Function to shift segment order indexes
CREATE OR REPLACE FUNCTION shift_segments(p_project_id UUID, p_after_index INTEGER, p_shift INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE segments
    SET order_index = order_index + p_shift
    WHERE project_id = p_project_id AND order_index > p_after_index;
END;
$$ LANGUAGE plpgsql;

-- User settings table for global defaults
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_aspect_ratio TEXT DEFAULT '16:9',
  default_style TEXT DEFAULT 'anime',
  default_voice_id TEXT DEFAULT 'pNInz6obpgDQGcFmaJgB',
  default_video_model TEXT DEFAULT 'seedance-v1',
  default_duration INTEGER DEFAULT 60,
  include_subtitles BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default row if not exists
-- INSERT INTO user_settings (id) VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING;

-- Video jobs table for tracking long-running generation tasks
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  external_job_id TEXT, 
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress FLOAT DEFAULT 0,
  output_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Index for job status tracking and segment lookup
CREATE INDEX IF NOT EXISTS idx_video_jobs_segment_id ON video_jobs(segment_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at DESC);

-- Model selection and pricing metadata
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS image_model TEXT NOT NULL DEFAULT 'nano-banana-2',
  ADD COLUMN IF NOT EXISTS video_model TEXT NOT NULL DEFAULT 'hailuo-02-pro',
  ADD COLUMN IF NOT EXISTS pricing_version TEXT NOT NULL DEFAULT 'v1';

ALTER TABLE segments
  ADD COLUMN IF NOT EXISTS image_model TEXT,
  ADD COLUMN IF NOT EXISTS video_model TEXT,
  ADD COLUMN IF NOT EXISTS last_quote_credits INTEGER;

ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS quote_credits INTEGER,
  ADD COLUMN IF NOT EXISTS pricing_version TEXT,
  ADD COLUMN IF NOT EXISTS operation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_video_jobs_model_id ON video_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_operation_id ON video_jobs(operation_id);

-- Pricing versions and credit ledger
CREATE TABLE IF NOT EXISTS pricing_versions (
  id TEXT PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  balance_credits INTEGER NOT NULL DEFAULT 3000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_accounts_project_unique UNIQUE (project_id),
  CONSTRAINT credit_accounts_balance_nonnegative CHECK (balance_credits >= 0)
);

DROP TRIGGER IF EXISTS update_credit_accounts_updated_at ON credit_accounts;
CREATE TRIGGER update_credit_accounts_updated_at
  BEFORE UPDATE ON credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS credit_ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('reserve', 'finalize', 'release', 'topup', 'adjustment')),
  amount_credits INTEGER NOT NULL,
  model_id TEXT,
  pricing_version TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_ledger_entries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_account_id ON credit_ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_operation_id ON credit_ledger_entries(operation_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_created_at ON credit_ledger_entries(created_at DESC);
