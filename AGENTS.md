# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-26 10:20 KST
**Commit:** c5911c5
**Branch:** feature/channel-automation

## OVERVIEW
AutoVideo is a Next.js 16 + TypeScript pipeline that generates short-form videos (script -> TTS -> image -> video -> render) using Supabase, Gemini, ElevenLabs, Fal, and Remotion.
This repo is not a plain CRUD app: render/download paths depend on local filesystem and long-running server execution.

## STRUCTURE
```text
./
|- src/                 # App router, APIs, providers, UI, AI/provider abstractions
|  |- app/              # Pages + API handlers (route.ts)
|  |- lib/              # AI/video/image/audio integration modules
|- supabase/migrations/ # SQL schema evolution
|- scripts/             # Root-level ad hoc maintenance scripts
|- src/scripts/         # Runtime bot and debug flow scripts
|- public/styles/       # Style reference images used by generators
```

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Project CRUD + automation creation | `src/app/api/project/route.ts` | Includes manual create, duplicate, channel/test-run automation |
| End-to-end autopilot stream | `src/app/api/autopilot/create/route.ts` | SSE event stream; creates project + segments + media steps |
| Video generation job lifecycle | `src/app/api/video/generate/route.ts` | Provider selection, job table sync, status polling |
| Server render + download path | `src/app/api/render/route.ts`, `src/app/api/download/route.ts` | Uses `os.tmpdir()` and local temp files |
| Remotion composition entry | `src/remotion/index.ts`, `src/remotion/Root.tsx` | Bundled by render route |
| AI script/prompt behavior | `src/lib/ai/gemini.ts`, `src/lib/ai/videoPrompt.ts` | Contains persona/style instructions |
| Supabase client contract | `src/lib/supabase.ts` | Client + service-role server client |
| Schema changes | `supabase/migrations/*.sql` | No CI migration runner present |

## CODE MAP
| Symbol/Module | Type | Location | Role |
|---|---|---|---|
| `Home` | page component | `src/app/page.tsx` | Dashboard listing/edit/delete/sync projects |
| `ProjectLayout` | layout component | `src/app/project/[id]/layout.tsx` | Shared stepper + polling provider wrapper |
| `/api/project` handlers | route handlers | `src/app/api/project/route.ts` | Core project API surface |
| `/api/video/generate` handlers | route handlers | `src/app/api/video/generate/route.ts` | Submit/check provider video jobs |
| `/api/render` `POST` | route handler | `src/app/api/render/route.ts` | SSE render progress + output filename |
| `generateScript` | AI function | `src/lib/ai/gemini.ts` | Script generation + style/persona/tone logic |
| `getVideoProvider` | factory | `src/lib/video/VideoProvider.ts` | Video provider abstraction |

## CONVENTIONS (PROJECT-SPECIFIC)
- App Router is centered in `src/app`, with auth gating in root `middleware.ts`.
- API handlers live in deep `src/app/api/<domain>/<action>/route.ts` namespaces.
- Heavy use of SSE (`text/event-stream`) for long-running jobs (`autopilot`, `render`).
- Path alias `@/* -> src/*` is required (`tsconfig.json`).
- Remotion native packages are pinned in `next.config.ts` `serverExternalPackages`.
- Test framework is not configured (no `test` script, no repo test tree).

## HIERARCHY
- See `src/app/create/AGENTS.md` for create wizard conventions and redirect semantics.
- See `src/app/project/AGENTS.md` for per-project step flow and polling ownership.
- See `src/lib/video/AGENTS.md` for provider abstraction and workflow constants.
- See `src/remotion/AGENTS.md` for composition contracts used by `/api/render`.
- See `src/scripts/AGENTS.md` for runtime bot/debug scripts under `src/`.

## ANTI-PATTERNS (THIS PROJECT)
- Do not assume serverless runtime for render/download; filesystem coupling is intentional.
- Do not remove character/style anchor prompts in `src/lib/ai/gemini.ts` (style identity depends on them).
- Do not move autopilot orchestration fully server-side without checking client query-parameter flow.
- Do not rely on `scripts/run-migration-placeholder.ts` as a real migration runner.

## UNIQUE STYLES
- Mixed Korean/English UX and logs are normal.
- Some critical routes use `// @ts-nocheck`; avoid broad refactors unless you can restore type safety safely.
- `public/styles/*` images are runtime references for image/thumbnail generation, not static decoration.

## COMMANDS
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run bot
```

## NOTES
- Root `scripts/` and `supabase/migrations/` are first-class domains; not dead folders.
- `.env.local` drives all provider keys and bot credentials in local/dev workflows.
