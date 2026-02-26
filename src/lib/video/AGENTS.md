# VIDEO PROVIDER NOTES

**Scope:** `src/lib/video/*`

## OVERVIEW
`src/lib/video` defines the provider abstraction for video generation, the fal.ai implementation, and workflow constants used by generation flows.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Provider contracts and factory | `src/lib/video/VideoProvider.ts` | Unified types/status mapping + `getVideoProvider` |
| fal.ai implementation | `src/lib/video/FalVideoProvider.ts` | Submits/checks provider jobs |
| Public exports | `src/lib/video/index.ts` | Stable module boundary for imports |
| Workflow constants | `src/lib/video/workflows.ts` | Large workflow map and IDs |

## CONVENTIONS
- All providers must implement `VideoProvider` and return unified `VideoJobStatus` values.
- Route handlers should instantiate providers through `getVideoProvider`, not direct provider class imports.
- Keep provider-specific status translation inside the provider implementation.
- Keep workflow IDs and keys stable unless all dependent callers are updated and validated.

## ANTI-PATTERNS
- Do not call fal client APIs directly from route handlers when provider abstraction exists.
- Do not leak provider-specific status strings outside provider modules.
- Do not bypass env-based credentials (`FAL_KEY`) checks in production code paths.
- Do not make broad workflow constant edits without targeted verification of generation behavior.

## NOTES
- `VideoProvider.ts` uses a lazy `require` for provider loading to avoid circular dependency issues.
- This domain is a high-change hotspot; keep edits small and provider-scoped when possible.
