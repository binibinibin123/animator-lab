-- Robust migration to ensure projects table and youtube_metadata column exist

-- 1. Create projects table if it doesn't exist (Base definition from schema.sql)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID, -- REFERENCES channels(id) removed to avoid dependency error if channels missing, add FK later if needed
  is_test_run BOOLEAN DEFAULT false,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT '16:9',
  style TEXT DEFAULT 'anime',
  status TEXT DEFAULT 'settings',
  duration INTEGER DEFAULT 60,
  video_url TEXT,
  thumbnail_url TEXT,
  autopilot_status TEXT, 
  autopilot_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add youtube_metadata column regardless of when table was created
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS youtube_metadata jsonb DEFAULT '{}'::jsonb;

-- Comment
COMMENT ON COLUMN projects.youtube_metadata IS 'Stores generated YouTube metadata: titles, description, tags, seed_keywords';
