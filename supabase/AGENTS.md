# SUPABASE DOMAIN NOTES

**Scope:** `supabase/*`

## OVERVIEW
`supabase/migrations` tracks schema evolution for projects, segments, channels, provider metadata, and helper RPCs.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Channels schema introduction | `supabase/migrations/20250124_add_channels.sql` | Adds channel-centric automation fields |
| Video prompt/provider fields | `supabase/migrations/20260119_video_prompt.sql`, `20260119_video_provider.sql` | Provider/prompt columns |
| Storage policy fixes | `supabase/migrations/20260124_fix_storage_rls.sql` | Bucket/public policy fixes |
| RPC helpers | `supabase/migrations/20260125_add_rpc.sql`, `20260125_add_update_rpc.sql` | Server-side helper routines |

## CONVENTIONS
- Migration files are timestamp-prefixed SQL; apply in chronological order.
- Repo has no CI migration runner; schema updates are operational/manual.

## ANTI-PATTERNS
- Do not rely on `scripts/run-migration-placeholder.ts` for real migration execution.
- Do not assume app code can work against partially-applied migration sets.
