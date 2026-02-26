# PROJECT FLOW NOTES

**Scope:** `src/app/project/*`

## OVERVIEW
`src/app/project/[id]` is the per-project production workflow (script -> voice -> image -> video -> thumbnail -> preview) with shared polling and autopilot-aware navigation.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Shared project shell | `src/app/project/[id]/layout.tsx` | Stepper, title header, `VideoPollingProvider`, `AutopilotWidget` |
| Project entry redirect | `src/app/project/[id]/page.tsx` | Redirects to `/project/{id}/script` |
| Script step | `src/app/project/[id]/script/page.tsx` | Script generation + segment bootstrap |
| Voice step | `src/app/project/[id]/voice/page.tsx` | Per-segment TTS generation |
| Image step | `src/app/project/[id]/image/page.tsx` | Prompt/image generation and segment image state |
| Video step | `src/app/project/[id]/video/page.tsx` | Video generation controls + polling state |
| Thumbnail/metadata step | `src/app/project/[id]/thumbnail/page.tsx` | Thumbnail and metadata packaging |
| Final preview step | `src/app/project/[id]/preview/page.tsx` | Remotion preview/render and download flow |
| Shared polling logic | `src/context/VideoPollingContext.tsx` | Central long-running video job polling |

## CONVENTIONS
- Keep step path names consistent with `PROJECT_STEPS` in layout.
- Preserve step order semantics (`script -> voice -> image -> video -> thumbnail -> preview`) unless all links/redirects are updated together.
- Use `VideoPollingProvider` as the single polling state source for project-step pages.
- Maintain autopilot query/state compatibility when auto-advancing between steps.

## ANTI-PATTERNS
- Do not rename step route segments without updating layout step detection and create-flow redirect shims.
- Do not add independent polling loops in multiple step pages when context polling is available.
- Do not break autopilot transitions by removing `autopilot` query checks or project autopilot status reads.
- Do not couple step pages directly to provider internals; keep provider specifics in `src/lib/*`.

## NOTES
- `image`, `video`, and `preview` are the heaviest UI surfaces in this domain.
- Render/preview behavior is tightly coupled with `src/remotion/*` and `/api/render`.
