-- Add Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT, -- Used for random topic context
  type TEXT DEFAULT 'youtube', -- youtube, shorts, etc.
  
  -- Visual Persona (Unified Input)
  visual_persona_url TEXT, -- Reference image URL
  style_preset TEXT DEFAULT 'anime', -- internal mapping for prompt engineering
  
  -- Voice Persona
  voice_id TEXT,
  
  -- Topic Source Config
  topic_source TEXT DEFAULT 'manual', -- manual, rss, random
  rss_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update Projects table to link to Channels
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_test_run BOOLEAN DEFAULT false;

-- Add updated_at trigger for channels
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
