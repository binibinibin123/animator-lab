-- Model selection metadata + credit ledger foundations

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS image_model text NOT NULL DEFAULT 'nano-banana-2',
ADD COLUMN IF NOT EXISTS video_model text NOT NULL DEFAULT 'hailuo-02-pro',
ADD COLUMN IF NOT EXISTS pricing_version text NOT NULL DEFAULT 'v1';

ALTER TABLE public.segments
ADD COLUMN IF NOT EXISTS image_model text,
ADD COLUMN IF NOT EXISTS video_model text,
ADD COLUMN IF NOT EXISTS last_quote_credits integer;

ALTER TABLE public.video_jobs
ADD COLUMN IF NOT EXISTS model_id text,
ADD COLUMN IF NOT EXISTS quote_credits integer,
ADD COLUMN IF NOT EXISTS pricing_version text,
ADD COLUMN IF NOT EXISTS operation_id text;

CREATE INDEX IF NOT EXISTS idx_video_jobs_model_id ON public.video_jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_operation_id ON public.video_jobs(operation_id);

CREATE TABLE IF NOT EXISTS public.pricing_versions (
    id text PRIMARY KEY,
    is_active boolean NOT NULL DEFAULT false,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    balance_credits integer NOT NULL DEFAULT 3000,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_accounts_project_unique UNIQUE (project_id),
    CONSTRAINT credit_accounts_balance_nonnegative CHECK (balance_credits >= 0)
);

DROP TRIGGER IF EXISTS update_credit_accounts_updated_at ON public.credit_accounts;
CREATE TRIGGER update_credit_accounts_updated_at
    BEFORE UPDATE ON public.credit_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.credit_ledger_entries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id uuid NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    operation_id text NOT NULL,
    idempotency_key text NOT NULL,
    entry_type text NOT NULL CHECK (entry_type IN ('reserve', 'finalize', 'release', 'topup', 'adjustment')),
    amount_credits integer NOT NULL,
    model_id text,
    pricing_version text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT credit_ledger_entries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_account_id ON public.credit_ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_operation_id ON public.credit_ledger_entries(operation_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_entries_created_at ON public.credit_ledger_entries(created_at DESC);

INSERT INTO public.pricing_versions (id, is_active, config)
VALUES (
    'v1',
    true,
    jsonb_build_object(
        'image', jsonb_build_object(
            'nano-banana-2', jsonb_build_object('baseCreditsPerImage', 25),
            'nano-banana-pro', jsonb_build_object('baseCreditsPerImage', 40)
        ),
        'video', jsonb_build_object(
            'hailuo-02-pro', jsonb_build_object('baseCreditsPerSecond', 8),
            'kling-2.6-pro', jsonb_build_object('baseCreditsPerSecond', 7, 'audioMultiplier', 2),
            'wan-2.5', jsonb_build_object('baseCreditsPerSecond', 5),
            'ltx-2.0-pro', jsonb_build_object('baseCreditsPerSecond', 6),
            'veo-3-fast', jsonb_build_object('baseCreditsPerSecond', 10, 'audioMultiplier', 1.5)
        )
    )
)
ON CONFLICT (id) DO UPDATE
SET is_active = EXCLUDED.is_active,
    config = EXCLUDED.config;
