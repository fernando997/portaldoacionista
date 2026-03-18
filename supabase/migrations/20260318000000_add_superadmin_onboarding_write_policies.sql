-- Permite que superadmin crie e exclua onboarding requests
CREATE POLICY "Superadmins can insert onboarding_requests"
  ON public.onboarding_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete onboarding_requests"
  ON public.onboarding_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Permite que superadmin insira logs de onboarding (necessário para reenvio)
CREATE POLICY "Superadmins can insert onboarding_logs"
  ON public.onboarding_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
