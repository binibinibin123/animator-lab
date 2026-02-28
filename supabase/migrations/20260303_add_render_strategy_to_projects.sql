ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS render_strategy text NOT NULL DEFAULT 'native'
CHECK (render_strategy IN ('native', 'reframe_portrait'));

UPDATE public.projects
SET render_strategy = 'native'
WHERE render_strategy IS NULL;
