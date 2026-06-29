-- Tabela para armazenar credenciais Asaas de sub-contas criadas
-- Sem RLS policies = apenas service_role pode acessar
CREATE TABLE public.asaas_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_request_id UUID NOT NULL UNIQUE REFERENCES public.onboarding_requests(id) ON DELETE CASCADE,
  asaas_account_id TEXT NOT NULL,
  asaas_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asaas_credentials ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy = nenhum usuario autenticado pode ler/escrever. Apenas service_role.
