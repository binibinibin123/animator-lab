# APP DOMAIN NOTES

**Scope:** `src/app/*`

## OVERVIEW
`src/app` is the App Router surface: public landing/auth entry, authenticated dashboards, create/project workflows, and all API handlers under `api/*/route.ts`.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Landing page + login modal | `src/app/page.tsx` | Public marketing surface; opens NextAuth modal; sends landing events |
| Project dashboard actions | `src/app/projects/page.tsx` | Fetch, filter, duplicate, rename, bulk delete |
| Channels operations | `src/app/channels/**/*` | Channel CRUD + automation launch UX |
| Project step shell | `src/app/project/[id]/layout.tsx` | Shared stepper + polling provider + autopilot widget |
| Create wizard shell | `src/app/create/layout.tsx` | Shared create flow layout |
| Autopilot UI stream parser | `src/app/create/autopilot/page.tsx` | Reads SSE events from backend |
| Main API surface | `src/app/api/**/route.ts` | Domain/action-separated handlers |

## HIERARCHY
- See `src/app/create/AGENTS.md` for create-wizard redirect and autopilot parsing rules.
- See `src/app/project/AGENTS.md` for per-project step flow and polling ownership.
- Keep shared App Router guidance here; avoid repeating child-domain specifics.

## CONVENTIONS
- `src/app/page.tsx` is not the dashboard anymore; it is the unauthenticated landing/login experience.
- Protected operational routes are `/projects`, `/create/*`, `/project/*`, `/channels/*`, `/settings`, gated by `middleware.ts` + `src/auth.ts`.
- Step pages under `project/[id]/*` are ordered workflow states, not isolated feature pages.
- API routes are colocated by domain/action (`project/reset-media`, `video/cancel`, `segment/update`).

## ANTI-PATTERNS
- Do not rename protected route segments without updating `middleware.ts`, `src/auth.ts`, and any callback URL logic.
- Do not change landing/login modal behavior in `/` without checking query-driven reopen logic (`login`, `callbackUrl`, `error`).
- Do not change autopilot SSE event labels without updating client parser logic.
- Do not move route handlers out of `route.ts`; App Router resolution depends on it.

## NOTES
- The dashboard and landing split is recent enough that older docs may still point to `/` as the project list.
- `/projects-test` and `/debug-db` are support/debug surfaces, not primary product flows.
