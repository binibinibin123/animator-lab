# Animator Lab Architecture

Animator Lab organizes an animation production pipeline around works, shots, generation takes, and render-ready selected media.

## Data Model

| Entity | Role |
|---|---|
| `projects` | Work-level metadata, story bible, default model choices, render settings |
| `segments` | Shot board rows. Each segment is treated as one animation cut |
| `generation_takes` | Image, video, or audio generation attempts for a shot |

Selected takes are copied back to `segments.image_url`, `segments.video_url`, or audio fields so Remotion preview and render can consume a stable media contract.

## Workflow

1. **New Work**
   - User enters logline, genre, tone, character notes, style rules, target duration, aspect ratio.
   - The app creates a project with `production_mode = animation`.

2. **Story / Shot Board**
   - The idea is expanded into a story bible.
   - Shots are edited as structured rows: narration, visual description, camera work, action, lighting, emotion, negative prompt, duration.

3. **Image Takes**
   - Cloud providers or Local ComfyUI generate candidate images per shot.
   - Results are stored as takes instead of overwriting the selected shot image immediately.

4. **Motion Takes**
   - Video providers generate image-to-video candidates.
   - Provider-specific payload mapping lives behind the model registry/provider layer.

5. **Selection**
   - A selected take updates the segment media URL.
   - Non-selected takes remain available for comparison and review.

6. **Preview / Render**
   - Remotion reads the selected segment media and renders a preview or final export.
   - TTS and audio are optional; silent animatic previews remain valid.

## Provider Boundary

The UI talks to model metadata and generation APIs using stable model IDs. Provider-specific differences are isolated in:

- `src/lib/models/registry.ts`
- `src/lib/image/*`
- `src/lib/video/*`
- `src/app/api/models/*`
- `src/app/api/image/generate`
- `src/app/api/video/generate`

This keeps UI copy, pricing labels, payload mapping, and fallback behavior in one place instead of scattering model-specific conditionals through pages.

## Local ComfyUI

`COMFYUI_BASE_URL` is optional. When it is missing, local models stay visible but marked offline. This makes the product usable in cloud-only mode while preserving a route for local/open-source workflow experiments.
