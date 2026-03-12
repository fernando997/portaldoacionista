-- Adiciona campos de pagamento ao onboarding
ALTER TABLE public.onboarding_requests
  ADD COLUMN IF NOT EXISTS payment_url    text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'GERADO';
