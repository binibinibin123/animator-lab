-- RPC function to fetch youtube_metadata safely
-- This bypasses PostgREST table schema cache issues by executing direct SQL

CREATE OR REPLACE FUNCTION get_project_metadata(p_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permission of creator (admin) to ensure access
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT youtube_metadata INTO result
    FROM projects
    WHERE id = p_id;
    
    RETURN result;
END;
$$;
