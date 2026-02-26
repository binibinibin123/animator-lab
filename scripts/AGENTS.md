# SCRIPTS DOMAIN NOTES

**Scope:** `scripts/*`

## OVERVIEW
Root `scripts` contains ad hoc local maintenance checks and provider sanity scripts, separate from the main app runtime.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Supabase connectivity check | `scripts/check-db.ts` | Manual table count/status print |
| Channels table check | `scripts/check-channels.ts` | Verifies channels query path |
| ElevenLabs API sanity | `scripts/test-elevenlabs.js` | Manual voice/list/generation checks |
| Migration experiment | `scripts/run-migration-placeholder.ts` | Placeholder, not production migration runner |

## CONVENTIONS
- Scripts parse `.env.local` directly and are intended for local CLI use.
- No script is wired into CI; execution is manual.

## ANTI-PATTERNS
- Do not treat these scripts as tested deployment tooling.
- Do not assume migration script actually executes SQL safely; it is incomplete by design.
