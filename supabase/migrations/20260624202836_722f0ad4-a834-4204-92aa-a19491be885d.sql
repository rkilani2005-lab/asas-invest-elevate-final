
-- 1. email_templates: drop public SELECT
DROP POLICY IF EXISTS "Anyone can view active email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. site_settings: restrict public SELECT to non-internal keys
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Public can view public site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key IN ('contact', 'social', 'seo'));
CREATE POLICY "Admins can view all site settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. newsletter_subscribers: stricter INSERT + admin-only ALL
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe with valid email"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
CREATE POLICY "Admins can manage newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. seller_submissions: stricter INSERT
DROP POLICY IF EXISTS "Anyone can submit a listing" ON public.seller_submissions;
CREATE POLICY "Public can submit a listing with valid data"
  ON public.seller_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    seller_name IS NOT NULL AND length(seller_name) BETWEEN 2 AND 120
    AND seller_email IS NOT NULL
    AND seller_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND property_name_en IS NOT NULL AND length(property_name_en) BETWEEN 2 AND 200
    AND status = 'pending'
  );

-- 5. storage.objects: restrict listing to admins; restrict seller-submission uploads to image files
DROP POLICY IF EXISTS "Anyone can view property media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
CREATE POLICY "Admins can list property media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'property-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can list site assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public can upload seller submission photos" ON storage.objects;
CREATE POLICY "Public can upload seller submission images"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = 'seller-submissions'
    AND length(name) <= 300
    AND lower(name) ~ '\.(jpg|jpeg|png|webp|gif|heic)$'
  );
