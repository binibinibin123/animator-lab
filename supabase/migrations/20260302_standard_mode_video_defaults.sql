-- Standard mode defaults and pricing snapshot refresh

ALTER TABLE public.projects
ALTER COLUMN video_model SET DEFAULT 'ltx-2-fast';

UPDATE public.projects
SET video_model = 'ltx-2-fast'
WHERE video_model IS NULL;

UPDATE public.pricing_versions
SET config = jsonb_build_object(
    'image', jsonb_build_object(
        'nano-banana-2', jsonb_build_object('baseCreditsPerImage', 25),
        'nano-banana-pro', jsonb_build_object('baseCreditsPerImage', 40)
    ),
    'video', jsonb_build_object(
        'ltx-2-fast', jsonb_build_object(
            'label', 'Standard Eco (LTX Fast)',
            'baseCreditsPerSecond', 6,
            'creditsPer6sCut', 36,
            'creditsPer30sShort', 180
        ),
        'hailuo-02-standard', jsonb_build_object(
            'label', 'Standard Balanced (Hailuo 02 Standard)',
            'baseCreditsPerSecond', 6.666,
            'creditsPer6sCut', 40,
            'creditsPer30sShort', 200
        ),
        'ltx-2.0-pro', jsonb_build_object(
            'label', 'Standard Plus (LTX Pro)',
            'baseCreditsPerSecond', 8,
            'creditsPer6sCut', 48,
            'creditsPer30sShort', 240
        )
    )
)
WHERE id = 'v1';
