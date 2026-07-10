-- Adiciona campo senha_certificado à tabela investidor_arquivos
ALTER TABLE public.investidor_arquivos
  ADD COLUMN senha_certificado TEXT;
