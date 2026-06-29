-- pedido_rastreador_pagamentos: controle de pagamento de rastreadores GPS por pedido

CREATE TABLE public.pedido_rastreador_pagamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id        UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('voucher_comprovante', 'pix_veiculo')),
  valor            NUMERIC(10,2) NOT NULL DEFAULT 990.00,
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  comprovante_url  TEXT,
  veiculo_index    INTEGER,  -- 1..N para pix_veiculo, NULL para voucher
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id)
);

CREATE INDEX ON public.pedido_rastreador_pagamentos (pedido_id);
CREATE INDEX ON public.pedido_rastreador_pagamentos (status);

-- RLS
ALTER TABLE public.pedido_rastreador_pagamentos ENABLE ROW LEVEL SECURITY;

-- Staff interno gerencia tudo
CREATE POLICY "internal users manage rastreador pagamentos" ON public.pedido_rastreador_pagamentos
  FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

-- Acionista le seus proprios pagamentos (via pedido -> investidor -> profile)
CREATE POLICY "shareholder reads own rastreador pagamentos" ON public.pedido_rastreador_pagamentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.pedidos ped
      JOIN public.investidores inv ON inv.id = ped.investidor_id
      JOIN public.profiles p ON p.id = inv.profile_id
      WHERE ped.id = public.pedido_rastreador_pagamentos.pedido_id
        AND p.user_id = auth.uid()
    )
  );

-- Service role (Edge Functions) pode inserir sem RLS via service_role key
