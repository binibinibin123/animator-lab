-- Check if video_url data exists
SELECT count(*) as total_segments,
       count(video_url) as segments_with_video,
       count(image_url) as segments_with_image
FROM segments;

-- Show first few video URLs to verify content
SELECT id, order_index, left(video_url, 50) as video_url_start
FROM segments
WHERE video_url IS NOT NULL
ORDER BY order_index
LIMIT 10;
