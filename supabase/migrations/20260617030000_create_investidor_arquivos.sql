-- investidor_arquivos: documentos armazenados por investidor
-- Storage bucket investidor-docs (público)

INSERT INTO storage.buckets (id, name, public)
VALUES ('investidor-docs', 'investidor-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.investidor_arquivos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investidor_id UUID NOT NULL REFERENCES public.investidores(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'outro',  -- 'rg_cnh' | 'comprovante_residencia' | 'outro'
  nome          TEXT,
  file_url      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id)
);

CREATE INDEX ON public.investidor_arquivos (investidor_id);

-- RLS
ALTER TABLE public.investidor_arquivos ENABLE ROW LEVEL SECURITY;

-- Staff interno gerencia tudo
CREATE POLICY "internal users manage investidor arquivos" ON public.investidor_arquivos
  FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

-- Acionista lê arquivos via seu investidor
CREATE POLICY "shareholder reads own arquivos" ON public.investidor_arquivos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.investidores inv
      JOIN public.profiles p ON p.id = inv.profile_id
      WHERE inv.id = public.investidor_arquivos.investidor_id
        AND p.user_id = auth.uid()
    )
  );

-- Storage policies para o bucket investidor-docs
CREATE POLICY "internal users upload investidor docs" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'investidor-docs' AND public.is_internal_user());

CREATE POLICY "investidor docs are public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'investidor-docs');

CREATE POLICY "internal users delete investidor docs" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'investidor-docs' AND public.is_internal_user());
