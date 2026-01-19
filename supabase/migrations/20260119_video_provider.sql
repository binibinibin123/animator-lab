-- ComfyUI Video Provider Integration Migration
-- Run this in Supabase SQL Editor

-- 1. Add video_provider column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS video_provider VARCHAR(20) DEFAULT 'fal';

-- 2. Add video_provider_override to segments table
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS video_provider_override VARCHAR(20);

-- 3. Create video_jobs table for async job tracking
CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('fal', 'comfyui')),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  progress REAL DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  external_job_id VARCHAR(255),
  output_url TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_segment_id ON video_jobs(segment_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- 6. Create policy (allow all for now, adjust as needed)
CREATE POLICY "Allow all operations on video_jobs" ON video_jobs
  FOR ALL USING (true) WITH CHECK (true);
