-- Fix: the UPDATE policy checked for status='pendente' but the default is 'pending'.
-- Update all existing 'pending' rows to 'pendente' and fix the column default.

-- 1) Align existing data
UPDATE public.onboarding_requests SET status = 'pendente' WHERE status = 'pending';

-- 2) Fix the column default
ALTER TABLE public.onboarding_requests ALTER COLUMN status SET DEFAULT 'pendente';
