# API DOMAIN NOTES

**Scope:** `src/app/api/*`

## OVERVIEW
API handlers are organized by domain and optional action, implemented as Next App Router `route.ts` modules.

## TAXONOMY
| Family | Paths | Responsibility |
|---|---|---|
| Project/segment lifecycle | `project/*`, `segment/*`, `settings/*` | CRUD, split/merge, metadata updates |
| Generation | `script/generate`, `tts/generate`, `image/generate`, `video/generate`, `thumbnail/generate` | AI/media generation and persistence |
| Long-running streams | `autopilot/create`, `render` | SSE progress/log/result events |
| Maintenance/utilities | `download`, `debug/cleanup-base64`, `utils/rss`, `voices`, `analyze-youtube` | Helpers, ops endpoints, ingestion |

## CONVENTIONS
- Use method exports (`GET`, `POST`, `PATCH`, `DELETE`) inside one `route.ts` when behavior shares a resource.
- Keep provider selection and polling in route handlers; adapters live in `src/lib/*`.
- Persist job/segment state in Supabase before returning response payloads.

## ANTI-PATTERNS
- Do not assume edge runtime; multiple handlers require Node APIs and local filesystem.
- Do not remove self-healing sync logic in `video/generate` unless replacement is proven.
- Do not duplicate endpoint responsibilities (existing `tts/route.ts` and `tts/generate/route.ts` already overlap).

## NOTES
- `render` and `autopilot/create` are streaming contracts; event names are API surface.
- `download` serves files from temp storage and includes filename sanitization checks.
