-- Permite que qualquer usuário autenticado acesse o formulário de onboarding pelo token
-- (necessário quando o acionista está logado no portal e abre o link de onboarding)
CREATE POLICY "Authenticated can view onboarding" ON public.onboarding_requests
  FOR SELECT TO authenticated
  USING (true);
