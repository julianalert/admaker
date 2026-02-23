-- Storage RLS: users can only access files under their own path.
-- Paths must be: {user_id}/{campaign_id}/... (first folder = auth.uid()).

-- Product photos bucket
CREATE POLICY "Users can upload product photos to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own product photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own product photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own product photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Generated ads bucket
CREATE POLICY "Users can upload generated ads to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-ads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own generated ads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-ads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own generated ads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'generated-ads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own generated ads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'generated-ads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
