# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-08
**Commit:** e2de509
**Branch:** feature/visual-mode-consistency

## OVERVIEW
AutoVideo is a Next.js 16 + TypeScript app for AI short-form video production: landing/login -> project setup -> script/TTS/image/video -> Remotion render/download.
Current runtime centers on Supabase, Gemini, ElevenLabs, fal.ai, NextAuth, and Remotion; several docs still describe older ComfyUI or Clerk-era plans.

## STRUCTURE
```text
./
|- src/app/              # App Router pages, layouts, route handlers
|- src/lib/              # AI/provider/media/credits/supabase integrations
|- src/remotion/         # Composition registration + render contracts
|- src/scripts/          # Runtime bot + local verification/debug scripts
|- supabase/migrations/  # Manual SQL schema evolution
|- docs/                 # Specs/runbooks; some are historical and drifted
|- tests/                # Playwright mocked e2e + env-gated smoke
|- public/styles/        # Style reference images used by generators/UI
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Landing page + login modal | `src/app/page.tsx` | Public marketing surface; sends `/api/landing/event`; opens NextAuth modal flow |
| Auth-gated project dashboard | `src/app/projects/page.tsx` | Project list, credits snapshot, duplicate/delete/rename actions |
| Create wizard + autopilot UI | `src/app/create/new/page.tsx`, `src/app/create/autopilot/page.tsx` | Manual create vs SSE autopilot start |
| Per-project production flow | `src/app/project/[id]/*` | Script -> voice -> image -> video -> thumbnail -> preview |
| Core project API surface | `src/app/api/project/route.ts` | Create/duplicate/update/delete + channel/test-run automation |
| Long-running streams | `src/app/api/autopilot/create/route.ts`, `src/app/api/render/route.ts` | SSE event contracts consumed literally by clients |
| Video provider + model pipeline | `src/lib/video/*`, `src/lib/models/registry.ts` | Provider abstraction, workflow metadata, pricing inputs |
| Remotion render contract | `src/remotion/Root.tsx`, `src/remotion/compositions/MainVideo.tsx` | Composition ID, schema, shorts/native render behavior |
| Test runner + suites | `playwright.config.ts`, `tests/**/*` | `mocked-e2e` and `smoke-real` projects |
| Schema truth | `supabase/migrations/*.sql` | Source of record when docs disagree |

## CODE MAP
| Symbol/Module | Type | Location | Role |
|---|---|---|---|
| `LandingPage` | client page | `src/app/page.tsx` | Public landing, login modal, landing analytics |
| `Home` | client page | `src/app/projects/page.tsx` | Authenticated dashboard for project operations |
| `ProjectLayout` | layout component | `src/app/project/[id]/layout.tsx` | Shared stepper, polling provider, autopilot widget |
| `/api/project` handlers | route handlers | `src/app/api/project/route.ts` | Main CRUD + automation entry point |
| `/api/autopilot/create` | route handler | `src/app/api/autopilot/create/route.ts` | SSE autopilot orchestration across the full media pipeline |
| `/api/video/generate` | route handler | `src/app/api/video/generate/route.ts` | Provider submission, credits reservation, job polling state |
| `getVideoProvider` | factory | `src/lib/video/VideoProvider.ts` | Provider abstraction boundary |
| `RemotionRoot` | composition root | `src/remotion/Root.tsx` | Schema + metadata contract for `/api/render` |

## CONVENTIONS (PROJECT-SPECIFIC)
- App Router lives under `src/app`; protected routes are gated through root `middleware.ts` + `src/auth.ts` NextAuth callbacks.
- Public landing is `/`; operational dashboard is `/projects`; do not treat `src/app/page.tsx` as the project list anymore.
- API handlers stay in `src/app/api/<domain>/<action>/route.ts`; many perform DB writes directly and call helpers in `src/lib/*`.
- SSE endpoints (`autopilot/create`, `render`) stream literal event names such as `log`, `progress`, `project_created`, `result`, `completed`, `error`.
- Path alias `@/* -> src/*` is required (`tsconfig.json`).
- Remotion native packages remain pinned in `next.config.ts` `serverExternalPackages`.
- Test coverage exists via Playwright, not a generic `npm test`: use `test:e2e` for mocked flows and `test:e2e:smoke` with `RUN_REAL_SMOKE=1` for real smoke.

## HIERARCHY
- See `src/AGENTS.md` for runtime surface map across app/lib/remotion/scripts.
- See `src/app/AGENTS.md` for routing, landing, dashboard, and API-placement rules.
- See `src/app/create/AGENTS.md` for create wizard and autopilot parsing rules.
- See `src/app/project/AGENTS.md` for project-step lifecycle and polling ownership.
- See `src/app/api/AGENTS.md` for route taxonomy and streaming cautions.
- See `src/lib/video/AGENTS.md` for provider abstraction and workflow constants.
- See `src/remotion/AGENTS.md` for composition and render contracts.
- See `src/scripts/AGENTS.md` for runtime script conventions.
- See `docs/AGENTS.md` for documentation drift warnings and spec map.
- See `tests/AGENTS.md` for Playwright project structure and test gating.

## ANTI-PATTERNS (THIS PROJECT)
- Do not assume docs are fresher than code: `README.md` is still stock create-next-app, some docs still mention ComfyUI or Clerk while runtime now uses fal.ai + NextAuth.
- Do not change SSE event names or response shapes casually; create/autopilot and render UIs parse them literally.
- Do not move provider-specific logic into page components or route handlers when an adapter/factory already exists in `src/lib/*`.
- Do not treat render/download as serverless-safe paths; local filesystem coupling is intentional in `/api/render` and `/api/download`.
- Do not rely on `scripts/run-migration-placeholder.ts` as a real migration runner.

## UNIQUE STYLES
- Mixed Korean/English UI copy, logs, and docs are normal.
- Landing/login uses a modal-first auth UX from `/` instead of a dedicated auth dashboard page.
- Credits visibility is part of the UX language across `/projects`, `/create/*`, and `/project/[id]/*`.
- Some critical routes still use `// @ts-nocheck`; avoid broad refactors unless you can restore type safety safely.

## COMMANDS
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run bot
npm run test:e2e
npm run test:e2e:smoke
```

## NOTES
- `docs/COMFYUI_*` and parts of `docs/USER_GUIDE.md` are historical references, not the current provider truth.
- `public/styles/*` assets are runtime references for create/autopilot style choices and generation prompts, not decorative images.
- Supabase migrations and `src/lib/models/registry.ts` are better indicators of current feature state than older specs.
