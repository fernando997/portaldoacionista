ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_investidor TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_tipo_investidor_check'
  ) THEN
    ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_tipo_investidor_check CHECK (tipo_investidor IN ('novo', 'ativo'));
  END IF;
END $$;
