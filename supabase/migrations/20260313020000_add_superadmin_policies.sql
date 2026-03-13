-- Políticas RLS para superadmin (precisa rodar após o enum ser comitado)
CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));
