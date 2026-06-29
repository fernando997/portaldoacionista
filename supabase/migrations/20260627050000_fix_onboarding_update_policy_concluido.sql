-- Fix: allow superadmins to fully manage onboarding_requests (UPDATE/DELETE)
-- and include 'concluido' as valid status in the general update policy

-- 1) Superadmin UPDATE policy (unrestricted)
CREATE POLICY "Superadmins can update onboarding_requests"
  ON public.onboarding_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 2) Fix the general update policy to also accept 'concluido'
DROP POLICY IF EXISTS "Anyone can update pending onboarding" ON public.onboarding_requests;

CREATE POLICY "Anyone can update pending onboarding" ON public.onboarding_requests
  FOR UPDATE
  USING (status = 'pendente')
  WITH CHECK (status IN ('pendente', 'completo', 'concluido'));
