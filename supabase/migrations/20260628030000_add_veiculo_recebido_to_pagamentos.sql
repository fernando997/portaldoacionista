ALTER TABLE public.pedido_rastreador_pagamentos
  ADD COLUMN IF NOT EXISTS veiculo_recebido_id UUID REFERENCES public.veiculos_recebidos(id);

CREATE INDEX IF NOT EXISTS idx_prp_veiculo_recebido
  ON public.pedido_rastreador_pagamentos (veiculo_recebido_id);
