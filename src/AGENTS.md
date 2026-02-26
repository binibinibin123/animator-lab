# SRC KNOWLEDGE BASE

**Scope:** `src/*`

## OVERVIEW
`src` contains the full application runtime surface: App Router pages/APIs, provider integrations, UI, Remotion composition, and runtime scripts.

## STRUCTURE
```text
src/
|- app/        # Pages + API route handlers
|- lib/        # AI/video/image/audio/supabase integrations
|- components/ # Reusable UI blocks
|- remotion/   # Video composition definitions
|- scripts/    # Telegram bot + debug checks
|- types/      # Shared TS contracts
```

## WHERE TO LOOK
| Task | Location | Why |
|---|---|---|
| Add/modify API behavior | `src/app/api/**/route.ts` | Server handlers are App Router route files |
| Add generation provider logic | `src/lib/video/*`, `src/lib/image/*`, `src/lib/ai/*` | Provider abstraction and adapter modules |
| Change project step UX | `src/app/project/[id]/*` | Shared layout + step pages |
| Change create wizard UX | `src/app/create/*` | Guided creation flow |
| Change dashboard cards/list | `src/app/page.tsx` | Main project listing and actions |
| Change render composition | `src/remotion/Root.tsx`, `src/remotion/compositions/*` | Remotion composition tree |

## HIERARCHY
- See `src/app/create/AGENTS.md` for create-flow-specific behavior.
- See `src/app/project/AGENTS.md` for per-project step lifecycle behavior.
- See `src/lib/video/AGENTS.md` for video provider and workflow notes.
- See `src/remotion/AGENTS.md` for composition + render contract details.
- See `src/scripts/AGENTS.md` for runtime script conventions.

## CONVENTIONS
- Import paths use `@/*` alias; avoid deep relative imports when equivalent alias exists.
- Route handlers combine business logic + DB IO directly; keep helper extraction in `src/lib` for reuse.
- Korean/English mixed strings are expected in logs and UI text.
- SSE endpoints (`autopilot`, `render`) stream event names that client pages parse literally.

## ANTI-PATTERNS
- Do not move provider-specific details into page components; keep them in `src/lib/*Provider*` modules.
- Do not change SSE event names casually (`log`, `progress`, `completed`, etc.); clients depend on them.
- Do not assume route handlers are edge-safe; several use Node-only modules (`fs`, `os`, `path`).

## NOTES
- `src/app` and `src/lib` are the two highest-change domains; start there for feature work.
- `src/scripts/bot.ts` is runtime code, not test tooling.
