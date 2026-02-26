# REMOTION NOTES

**Scope:** `src/remotion/*`

## OVERVIEW
`src/remotion` owns composition registration, schema/metadata contracts, and presentation logic used by `/api/render` and project preview.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Remotion entry registration | `src/remotion/index.ts` | `registerRoot(RemotionRoot)` |
| Composition schema/metadata | `src/remotion/Root.tsx` | Composition ID, zod schema, `calculateMetadata` |
| Main composition logic | `src/remotion/compositions/MainVideo.tsx` | Segment timing, transitions, overlays |
| Subtitle/title visuals | `src/remotion/components/{Subtitle,Title}.tsx` | Overlay components |
| Subtitle style presets | `src/remotion/constants/subtitleStyles.ts` | Style-name to style mapping |
| Render endpoint integration | `src/app/api/render/route.ts` | Bundles remotion entry and renders output |

## CONVENTIONS
- Keep composition ID `MainVideo` aligned with render callers unless all callers are updated.
- Keep zod schema and input props in sync when adding/changing composition fields.
- Preserve `calculateMetadata` behavior for fps/duration/shorts dimensions unless explicitly changing render contracts.
- Prefer composition-level changes in `MainVideo.tsx` over route-level ad hoc visual hacks.

## ANTI-PATTERNS
- Do not rename/remap composition IDs without updating `/api/render` defaults and client callers.
- Do not change `isShortsMode` dimension semantics casually; preview/render contracts depend on it.
- Do not move remotion entry path without updating route bundling logic.
- Do not duplicate subtitle style definitions across multiple files when constants exist.

## NOTES
- `MainVideo.tsx` is a heavy domain file; verify transition and overlay behavior for both horizontal and shorts modes after edits.
