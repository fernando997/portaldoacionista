-- Bucket para imagens do SAC (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sac-images', 'sac-images', true)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode fazer upload
CREATE POLICY "authenticated users upload sac images" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'sac-images' AND auth.uid() IS NOT NULL);

-- Leitura pública
CREATE POLICY "sac images are public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sac-images');
