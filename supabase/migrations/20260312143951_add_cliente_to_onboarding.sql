-- Adiciona coluna cliente à tabela onboarding_requests
ALTER TABLE public.onboarding_requests
  ADD COLUMN IF NOT EXISTS cliente text;
