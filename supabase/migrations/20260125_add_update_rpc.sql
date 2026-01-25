-- RPC function to UPDATE youtube_metadata safely
-- This bypasses PostgREST table schema cache issues by executing direct SQL

CREATE OR REPLACE FUNCTION update_project_metadata(p_id UUID, p_metadata jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE projects
    SET youtube_metadata = p_metadata
    WHERE id = p_id;
END;
$$;
