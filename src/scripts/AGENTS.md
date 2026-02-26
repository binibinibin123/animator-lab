# SRC SCRIPTS NOTES

**Scope:** `src/scripts/*`

## OVERVIEW
`src/scripts` contains runtime/diagnostic scripts for bot notifications and flow verification, separate from app-router request handlers.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Telegram bot runtime | `src/scripts/bot.ts` | Polling bot + project completion notifications |
| End-to-end flow verification | `src/scripts/verify_flow.ts` | Creates channel and calls local API for verification |
| DB state debugging | `src/scripts/debug_db_state.ts` | Dumps recent projects/segments snapshots |

## CONVENTIONS
- Scripts load `.env.local` via `dotenv` at startup.
- Scripts are local/manual tools; they are not wired to CI.
- Keep script output explicit and operational (status, IDs, failure causes).

## ANTI-PATTERNS
- Do not commit secrets/tokens or hardcoded personal IDs.
- Do not assume these scripts run in production runtime environments.
- Do not treat `verify_flow.ts` as a unit test; it expects a live `localhost:3000` API.

## NOTES
- `npm run bot` executes `src/scripts/bot.ts` via `tsx`.
- Supabase anon credentials are used in current scripts; adjust carefully if switching to service-role usage.
