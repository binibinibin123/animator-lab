-- Supabase SQL Schema for AutoVideo
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9' CHECK (aspect_ratio IN ('16:9', '1:1', '3:4', '9:16')),
  style TEXT DEFAULT 'anime',
  status TEXT DEFAULT 'settings' CHECK (status IN ('settings', 'script', 'voice', 'image', 'video', 'preview', 'completed')),
  duration INTEGER DEFAULT 60,
  video_url TEXT,
  thumbnail_url TEXT,
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
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Storage bucket for media files (run in Supabase Dashboard > Storage)
-- CREATE BUCKET IF NOT EXISTS 'autovideo-media' WITH (public = true);
