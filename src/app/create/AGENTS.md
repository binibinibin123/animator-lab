# CREATE FLOW NOTES

**Scope:** `src/app/create/*`

## OVERVIEW
`src/app/create` is the create wizard entry surface. It collects initial settings, then forwards users into per-project steps under `src/app/project/[id]/*`.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Create shell and step chrome | `src/app/create/layout.tsx` | Shared header + Stepper wrapper for create pages |
| New project initialization | `src/app/create/new/page.tsx` | Posts to `/api/project`, then routes to `/project/{id}/script` |
| Autopilot create mode UI | `src/app/create/autopilot/page.tsx` | Reads SSE events from `/api/autopilot/create` |
| Step redirects to project flow | `src/app/create/{script,voice,image,video,preview}/page.tsx` | Redirect shims using `projectId` query param |
| Debug-only create helper | `src/app/create/debug/page.tsx` | Local troubleshooting utility |

## CONVENTIONS
- `/create` always redirects to `/create/new`.
- `script/voice/image/video/preview` pages in this folder are redirect shims, not full editors.
- SSE event names from autopilot are parsed literally (`log`, `progress`, `project_created`, `completed`, `error`).
- Keep create-shell visuals aligned with project-shell conventions when changing UX copy or ordering.

## ANTI-PATTERNS
- Do not move heavy generation logic into redirect shims; keep logic in project-step pages and APIs.
- Do not rename `projectId` query usage without updating all create redirect pages.
- Do not change autopilot event names in UI parsing without matching backend updates.
- Do not add a `thumbnail` create-step route unless project step order and redirects are updated together.

## NOTES
- Korean/English mixed UI copy is normal in this flow.
- Most stateful generation behavior after project creation lives under `src/app/project/[id]/*`.
