-- Add upscaled_video_url column to segments table
ALTER TABLE segments ADD COLUMN IF NOT EXISTS upscaled_video_url TEXT;
