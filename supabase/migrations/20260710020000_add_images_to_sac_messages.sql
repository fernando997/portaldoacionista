-- Adiciona suporte a imagens nas mensagens do SAC
ALTER TABLE public.sac_messages
  ADD COLUMN IF NOT EXISTS image_urls TEXT[];
