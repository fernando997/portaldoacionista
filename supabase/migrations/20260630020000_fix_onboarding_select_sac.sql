-- Garante que roles SAC, vendedor e suporte podem ler onboarding_requests
-- A policy "Authenticated can view onboarding" deveria cobrir isso, mas
-- recriamos com nomes explícitos por segurança

DROP POLICY IF EXISTS "Authenticated can view onboarding" ON public.onboarding_requests;

CREATE POLICY "Authenticated can view onboarding"
  ON public.onboarding_requests FOR SELECT TO authenticated
  USING (true);
