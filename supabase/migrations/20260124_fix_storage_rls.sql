-- Enable storage policies for autovideo-media bucket

-- 1. Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('autovideo-media', 'autovideo-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (usually enabled by default, but ensuring)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Allow Public SELECT (Read)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'autovideo-media' );

-- 4. Allow Public INSERT (Upload)
create policy "Public Upload"
on storage.objects for insert
with check ( bucket_id = 'autovideo-media' );
