CREATE OR REPLACE FUNCTION public.sync_veiculo_recebido_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.veiculo_recebido_id IS NOT NULL THEN
    UPDATE public.veiculos_recebidos SET status = 'pago' WHERE id = NEW.veiculo_recebido_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_veiculo_status
  AFTER UPDATE OF status ON public.pedido_rastreador_pagamentos
  FOR EACH ROW WHEN (NEW.status = 'pago')
  EXECUTE FUNCTION public.sync_veiculo_recebido_status();
