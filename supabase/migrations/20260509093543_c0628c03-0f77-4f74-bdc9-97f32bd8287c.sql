
CREATE POLICY "Public can upload seller submission photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = 'seller-submissions'
);
