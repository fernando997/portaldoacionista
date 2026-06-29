ALTER TABLE public.onboarding_requests
  ADD COLUMN IF NOT EXISTS razao_social TEXT;
