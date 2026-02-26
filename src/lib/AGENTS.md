# LIB DOMAIN NOTES

**Scope:** `src/lib/*`

## OVERVIEW
`src/lib` contains provider adapters and shared integration logic for AI text/media generation, Supabase access, and media pipelines.

## WHERE TO LOOK
| Task | Location | Notes |
|---|---|---|
| Script/topic generation | `src/lib/ai/gemini.ts` | Persona prompts, language rules, style anchors |
| Video prompt analysis | `src/lib/ai/videoPrompt.ts` | Image-to-motion prompt shaping |
| TTS generation | `src/lib/ai/elevenlabs.ts` | Voice provider call surface |
| Video provider abstraction | `src/lib/video/VideoProvider.ts` | Adapter interface + factory |
| Image generation abstraction | `src/lib/image/*` | Provider interface/workflows |
| DB client contract | `src/lib/supabase.ts` | Browser client + service-role server client |

## HIERARCHY
- See `src/lib/video/AGENTS.md` for provider factory, fal adapter, and workflow-constant cautions.
- Keep this file focused on cross-lib integration rules; keep provider-specific details in child docs.

## CONVENTIONS
- Keep provider-specific HTTP logic in dedicated adapter files, not in API route handlers.
- Export stable interfaces/factories from domain index files.
- Maintain style/persona prompt constraints when editing generation prompts.

## ANTI-PATTERNS
- Do not remove identity constraints from style presets (character consistency depends on them).
- Do not hardwire API route concerns into adapter modules.
- Do not bypass `createServerClient()` for privileged writes.
