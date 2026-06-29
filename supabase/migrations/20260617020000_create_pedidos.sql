-- pedidos: pedidos de veículos vinculados a investidores

CREATE TABLE public.pedidos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               BIGINT GENERATED ALWAYS AS IDENTITY,
  investidor_id        UUID NOT NULL REFERENCES public.investidores(id) ON DELETE CASCADE,
  fornecedor_bubble_id TEXT,
  fornecedor_nome      TEXT,
  modelo               TEXT,
  quantidade           INTEGER NOT NULL DEFAULT 1,
  frota_bubble_id      TEXT,
  frota_nome           TEXT,
  pagamento_rastreador TEXT CHECK (pagamento_rastreador IN ('pix_recebimento', 'voucher')),
  status               TEXT NOT NULL DEFAULT 'NOVO PEDIDO',
  observacao           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users(id)
);

CREATE INDEX ON public.pedidos (investidor_id);
CREATE INDEX ON public.pedidos (status);
CREATE INDEX ON public.pedidos (created_at DESC);

-- RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Staff interno gerencia tudo
CREATE POLICY "internal users manage pedidos" ON public.pedidos
  FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

-- Acionista lê pedidos via seu investidor (profile_id → user_id)
CREATE POLICY "shareholder reads own pedidos" ON public.pedidos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.investidores inv
      JOIN public.profiles p ON p.id = inv.profile_id
      WHERE inv.id = public.pedidos.investidor_id
        AND p.user_id = auth.uid()
    )
  );
