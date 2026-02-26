# ComfyUI Removal Migration Runbook

This runbook applies the schema cleanup introduced in `supabase/migrations/20260223_remove_comfyui_residue.sql`.

## 1) Apply migration in Supabase SQL Editor

Open Supabase Dashboard -> SQL Editor and run:

```sql
ALTER TABLE segments
DROP COLUMN IF EXISTS upscaled_video_url,
DROP COLUMN IF EXISTS video_provider_override;

ALTER TABLE video_jobs
DROP CONSTRAINT IF EXISTS video_jobs_provider_check;

UPDATE video_jobs
SET provider = 'fal'
WHERE provider IS DISTINCT FROM 'fal';

ALTER TABLE video_jobs
ADD CONSTRAINT video_jobs_provider_check CHECK (provider IN ('fal'));
```

## 2) Verify schema changed

Run these checks:

```sql
-- segments should NOT have removed columns
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'segments'
  and column_name in ('upscaled_video_url', 'video_provider_override');

-- video_jobs provider check should only allow fal
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on c.conrelid = t.oid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'video_jobs'
  and c.contype = 'c';
```

```sql
-- no non-fal rows should remain
select provider, count(*)
from video_jobs
group by provider
having provider <> 'fal';
```

Expected:
- first query returns 0 rows
- second query includes `CHECK ((provider)::text = 'fal'::text)` equivalent
- third query returns 0 rows

## 3) Optional data sanity check

```sql
select provider, count(*)
from video_jobs
group by provider
order by provider;
```

Expected: only `fal` provider rows remain valid.
