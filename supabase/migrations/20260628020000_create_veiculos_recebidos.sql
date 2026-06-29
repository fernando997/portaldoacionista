CREATE TABLE public.veiculos_recebidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  chassi              TEXT NOT NULL,
  data_recebimento    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status              TEXT NOT NULL DEFAULT 'recebido'
                      CHECK (status IN ('recebido', 'cobranca_gerada', 'pago')),
  asaas_payment_id    TEXT,
  asaas_payment_url   TEXT,
  asaas_customer_id   TEXT,
  valor_cobranca      NUMERIC(10,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_veiculos_recebidos_chassi UNIQUE (chassi)
);

CREATE INDEX idx_veiculos_recebidos_pedido ON public.veiculos_recebidos (pedido_id);
CREATE INDEX idx_veiculos_recebidos_status ON public.veiculos_recebidos (status);
CREATE INDEX idx_veiculos_recebidos_asaas ON public.veiculos_recebidos (asaas_payment_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_veiculos_recebidos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_veiculos_recebidos_updated_at
  BEFORE UPDATE ON public.veiculos_recebidos
  FOR EACH ROW EXECUTE FUNCTION public.set_veiculos_recebidos_updated_at();

-- RLS
ALTER TABLE public.veiculos_recebidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal users manage veiculos recebidos" ON public.veiculos_recebidos
  FOR ALL USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE POLICY "shareholder reads own veiculos recebidos" ON public.veiculos_recebidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pedidos ped
      JOIN public.investidores inv ON inv.id = ped.investidor_id
      JOIN public.profiles p ON p.id = inv.profile_id
      WHERE ped.id = public.veiculos_recebidos.pedido_id
        AND p.user_id = auth.uid()
    )
  );
