-- Add video_prompt column to segments table
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS video_prompt TEXT;

-- Create index for video_prompt if needed (optional, but good for completeness if we search by it)
-- CREATE INDEX IF NOT EXISTS idx_segments_video_prompt ON segments(video_prompt);

-- Refresh the schema cache if Supabase requires it (usually automatic)
