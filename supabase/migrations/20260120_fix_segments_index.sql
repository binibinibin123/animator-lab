-- Add indexes to segments table to fix timeout issues
-- Run this in Supabase SQL Editor

-- Index for filtering segments by project (most common query)
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id);

-- Index for ordering segments (often used with project_id)
CREATE INDEX IF NOT EXISTS idx_segments_order ON segments(project_id, order_index);

-- Verify indexes (optional query to run separately)
-- SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename = 'segments';
