
CREATE TABLE public.onboarding_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_request_id uuid REFERENCES public.onboarding_requests(id) ON DELETE CASCADE NOT NULL,
  pedido_id text NOT NULL,
  request_payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (onboarding is public by token)
CREATE POLICY "Public can insert logs" ON public.onboarding_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins can view logs
CREATE POLICY "Admins can view logs" ON public.onboarding_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
