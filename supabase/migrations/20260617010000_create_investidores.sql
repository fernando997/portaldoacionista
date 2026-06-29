-- investidores: pré-cadastro de investidores (ligados ou não a um profile)

CREATE TABLE public.investidores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  cpf          TEXT,
  estado_civil TEXT,
  profissao    TEXT,
  email        TEXT,
  whatsapp     TEXT,
  rua          TEXT,
  numero       TEXT,
  bairro       TEXT,
  cidade       TEXT,
  estado       TEXT,
  cep          TEXT,
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES auth.users(id)
);

CREATE INDEX ON public.investidores (profile_id);
CREATE INDEX ON public.investidores (nome);
CREATE INDEX ON public.investidores (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_investidores_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_investidores_updated_at
  BEFORE UPDATE ON public.investidores
  FOR EACH ROW EXECUTE FUNCTION public.set_investidores_updated_at();

-- RLS
ALTER TABLE public.investidores ENABLE ROW LEVEL SECURITY;

-- Staff interno gerencia tudo
CREATE POLICY "internal users manage investidores" ON public.investidores
  FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

-- Acionista lê o próprio registro (via profile_id → user_id)
CREATE POLICY "shareholder reads own investidor" ON public.investidores
  FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
