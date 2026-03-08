# SRC KNOWLEDGE BASE

**Scope:** `src/*`

## OVERVIEW
`src` contains the full runtime surface: App Router UI + APIs, provider/media integrations, Remotion composition code, and local operational scripts.

## STRUCTURE
```text
src/
|- app/        # Landing, dashboard, create/project flows, route handlers
|- lib/        # AI/video/image/audio/credits/supabase integrations
|- components/ # Reusable UI blocks and providers
|- remotion/   # Composition definitions + metadata contract
|- scripts/    # Bot + local verification/debug tools
|- types/      # Shared TS contracts
```

## WHERE TO LOOK
| Task | Location | Why |
|---|---|---|
| Change landing/login UX | `src/app/page.tsx` | Public entry, login modal, landing analytics |
| Change dashboard cards/list | `src/app/projects/page.tsx` | Authenticated project operations live here now |
| Add/modify API behavior | `src/app/api/**/route.ts` | Server handlers are App Router route files |
| Add generation provider logic | `src/lib/video/*`, `src/lib/image/*`, `src/lib/ai/*` | Provider abstraction and adapter modules |
| Change create wizard UX | `src/app/create/*` | Guided creation flow + autopilot start |
| Change project step UX | `src/app/project/[id]/*` | Shared layout + step pages |
| Change render composition | `src/remotion/Root.tsx`, `src/remotion/compositions/*` | Render contract + composition tree |

## HIERARCHY
- See `src/app/create/AGENTS.md` for create-flow-specific behavior.
- See `src/app/project/AGENTS.md` for per-project step lifecycle behavior.
- See `src/lib/video/AGENTS.md` for video provider and workflow notes.
- See `src/remotion/AGENTS.md` for composition + render contract details.
- See `src/scripts/AGENTS.md` for runtime script conventions.

## CONVENTIONS
- Import paths use `@/*` alias; avoid deep relative imports when equivalent alias exists.
- Route handlers often combine business logic + DB IO directly; shared/provider-specific logic belongs in `src/lib`.
- Korean/English mixed strings are expected in logs and UI text.
- SSE endpoints (`autopilot`, `render`) stream event names that client pages parse literally.
- `/` is marketing/auth entry; `/projects` is the authenticated dashboard; keep those roles distinct.

## ANTI-PATTERNS
- Do not move provider-specific details into page components; keep them in `src/lib/*Provider*` modules.
- Do not change SSE event names casually (`log`, `progress`, `completed`, etc.); clients depend on them.
- Do not assume route handlers are edge-safe; several use Node-only modules (`fs`, `os`, `path`).
- Do not trust older docs over runtime code for provider/auth truth.

## NOTES
- `src/app` and `src/lib` are still the two highest-change domains.
- `src/scripts/bot.ts` is runtime operational code, not test tooling.
