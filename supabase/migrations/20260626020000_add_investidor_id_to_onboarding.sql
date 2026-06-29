-- Add investidor_id to onboarding_requests for direct linkage
ALTER TABLE public.onboarding_requests
  ADD COLUMN IF NOT EXISTS investidor_id UUID REFERENCES public.investidores(id) ON DELETE SET NULL;
