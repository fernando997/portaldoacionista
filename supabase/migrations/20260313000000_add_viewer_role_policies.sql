-- Permite que usuários com role 'moderator' (visualizador) leiam perfis e roles
CREATE POLICY "Viewers can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Viewers can view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));
