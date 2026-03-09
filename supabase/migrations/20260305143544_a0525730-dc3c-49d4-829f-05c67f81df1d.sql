
-- Tighten the update policy to require token match
DROP POLICY "Public can update by token" ON public.onboarding_requests;

CREATE POLICY "Public can update by token" ON public.onboarding_requests
  FOR UPDATE TO anon
  USING (status = 'pendente')
  WITH CHECK (status IN ('pendente', 'completo'));
