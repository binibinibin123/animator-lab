-- Add video_prompt column to segments table
ALTER TABLE segments ADD COLUMN video_prompt TEXT;

-- Comment on column
COMMENT ON COLUMN segments.video_prompt IS 'The prompt used for video generation';
