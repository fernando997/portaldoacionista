-- Permite que viewer (moderator) e superadmin leiam os onboardings
CREATE POLICY "Viewers can view onboarding_requests"
  ON public.onboarding_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Superadmins can view onboarding_requests"
  ON public.onboarding_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Viewers can view onboarding_logs"
  ON public.onboarding_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Superadmins can view onboarding_logs"
  ON public.onboarding_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));
