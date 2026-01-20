-- [EMERGENCY FIX] Clear polluted Base64 image data
-- This will result in broken images for affected segments, but will fix the loading timeout.
-- Users can regenerate images later.

UPDATE segments
SET image_url = NULL
WHERE image_url LIKE 'data:image%';

-- Verify if any remain
SELECT count(*) as polluted_count FROM segments WHERE image_url LIKE 'data:image%';
