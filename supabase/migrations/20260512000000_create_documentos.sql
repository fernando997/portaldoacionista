CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  nome TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Admins e superadmins gerenciam tudo
CREATE POLICY "admins_manage_documentos" ON documentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('admin', 'superadmin')
    )
  );

-- Usuários autenticados leem documentos do seu próprio pedido_id
CREATE POLICY "users_read_own_documentos" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id_pedido = documentos.pedido_id
    )
  );

-- Moderators podem visualizar todos
CREATE POLICY "moderators_read_documentos" ON documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text = 'moderator'
    )
  );
