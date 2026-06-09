-- ============================================================
-- Adiciona roles internos ao enum app_role
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sac';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'suporte';

-- ============================================================
-- user_roles: superadmin e equipe interna podem ler todos os roles
-- (necessário para o join profiles + user_roles funcionar no frontend)
-- ============================================================
CREATE POLICY "Superadmins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Internal users can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor') OR
    public.has_role(auth.uid(), 'sac') OR
    public.has_role(auth.uid(), 'suporte')
  );

-- ============================================================
-- profiles: equipe interna pode visualizar todos os perfis
-- ============================================================
CREATE POLICY "Internal users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'vendedor') OR
    public.has_role(auth.uid(), 'sac') OR
    public.has_role(auth.uid(), 'suporte')
  );

-- Vendedor pode cadastrar acionistas
CREATE POLICY "Vendedor can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'vendedor'));

-- ============================================================
-- documentos: suporte pode visualizar todos os documentos
-- ============================================================
CREATE POLICY "suporte_read_documentos" ON public.documentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'suporte'));
