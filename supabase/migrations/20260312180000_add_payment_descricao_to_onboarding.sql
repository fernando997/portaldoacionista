-- Adiciona coluna de descrição do pagamento ao onboarding
ALTER TABLE public.onboarding_requests
  ADD COLUMN IF NOT EXISTS payment_descricao text;
