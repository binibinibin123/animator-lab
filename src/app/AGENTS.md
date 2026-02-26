# APP DOMAIN NOTES

**Scope:** `src/app/*`

## OVERVIEW
`src/app` is the App Router surface: user-facing pages, nested step flows, and all API handlers under `api/*/route.ts`.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Dashboard project list actions | `src/app/page.tsx` | Fetch, filter, duplicate, rename, bulk delete |
| Project step shell | `src/app/project/[id]/layout.tsx` | Shared stepper + polling provider + autopilot widget |
| Create wizard shell | `src/app/create/layout.tsx` | Shared create flow layout |
| Autopilot UI stream parser | `src/app/create/autopilot/page.tsx` | Reads SSE events from backend |
| Main API surface | `src/app/api/**/route.ts` | Domain/action-separated handlers |

## HIERARCHY
- See `src/app/create/AGENTS.md` for create-wizard-only redirect and autopilot parsing rules.
- See `src/app/project/AGENTS.md` for per-project step flow and polling ownership.
- Keep shared app-router-level guidance in this file; avoid duplicating child-domain specifics here.

## CONVENTIONS
- Page routes use client components heavily for direct Supabase reads and step navigation.
- Step pages under `project/[id]/*` are ordered workflow states, not isolated feature pages.
- API routes are colocated by domain/action (`project/reset-media`, `video/cancel`, `segment/update`).

## ANTI-PATTERNS
- Do not rename project step paths without updating stepper path matching and redirects.
- Do not change autopilot SSE event labels without updating client parser logic.
- Do not move route handlers out of `route.ts`; App Router resolution depends on it.
