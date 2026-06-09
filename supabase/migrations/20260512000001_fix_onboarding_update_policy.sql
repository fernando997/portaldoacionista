-- Estende a política de UPDATE do onboarding para cobrir usuários autenticados
-- (caso o acionista esteja logado no portal ao acessar o link de onboarding)
DROP POLICY IF EXISTS "Public can update by token" ON public.onboarding_requests;

CREATE POLICY "Anyone can update pending onboarding" ON public.onboarding_requests
  FOR UPDATE
  USING (status = 'pendente')
  WITH CHECK (status IN ('pendente', 'completo'));
