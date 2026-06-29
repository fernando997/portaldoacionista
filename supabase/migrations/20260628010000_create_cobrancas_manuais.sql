CREATE TABLE public.cobrancas_manuais (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investidor_id    UUID NOT NULL REFERENCES public.investidores(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('rastreador_manual', 'despesa')),
  descricao        TEXT,
  quantidade       INTEGER,
  valor            NUMERIC(10,2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  comprovante_url  TEXT,
  data_pagamento   TIMESTAMPTZ,
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id),
  baixa_by         UUID REFERENCES auth.users(id)
);

-- Indices
CREATE INDEX ON public.cobrancas_manuais (investidor_id);
CREATE INDEX ON public.cobrancas_manuais (status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_cobrancas_manuais_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_cobrancas_manuais_updated_at
  BEFORE UPDATE ON public.cobrancas_manuais
  FOR EACH ROW EXECUTE FUNCTION public.set_cobrancas_manuais_updated_at();

-- RLS (mesmo padrão de pedidos)
ALTER TABLE public.cobrancas_manuais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal users manage cobrancas manuais" ON public.cobrancas_manuais
  FOR ALL USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());
