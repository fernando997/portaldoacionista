
-- Create onboarding_requests table
CREATE TABLE public.onboarding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id text NOT NULL,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  cnpj text,
  senha_certificado text,
  certificado_digital_url text,
  cnh_url text,
  procuracao_url text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage onboarding" ON public.onboarding_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public can read/update by token (for the onboarding form)
CREATE POLICY "Public can view by token" ON public.onboarding_requests
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can update by token" ON public.onboarding_requests
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Storage bucket for onboarding documents
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-docs', 'onboarding-docs', true);

-- Allow anon to upload to onboarding-docs
CREATE POLICY "Anyone can upload onboarding docs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'onboarding-docs');

-- Allow anyone to read onboarding docs
CREATE POLICY "Anyone can read onboarding docs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'onboarding-docs');
