-- ═════════════════════════════════════════════════════════════════════════════
-- 20260514051505: Add video_url column to seller_submissions
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.seller_submissions
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.seller_submissions.video_url IS
  'Optional YouTube / Vimeo / direct .mp4 URL provided by the seller. Reviewed and (on approval) propagated to properties.video_url.';

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260514120000: translations_cache table for AI translation fallback
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.translations_cache (
  cache_key       TEXT PRIMARY KEY,
  source_locale   TEXT NOT NULL DEFAULT 'en',
  target_locale   TEXT NOT NULL,
  source_text     TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  model           TEXT,
  auto            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS translations_cache_target_idx
  ON public.translations_cache(target_locale);

CREATE INDEX IF NOT EXISTS translations_cache_updated_idx
  ON public.translations_cache(updated_at DESC);

COMMENT ON TABLE public.translations_cache IS
  'AI translation fallback cache. Populated by the translate-content edge function when a localized CMS field is missing. Read-public, write-service-role.';

COMMENT ON COLUMN public.translations_cache.cache_key IS
  'Namespaced key: <entity>:<id>:<field>. Examples: property:7a8b...:name, page:home.hero.headline, insight:123:title';

ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.translations_cache TO anon, authenticated;
GRANT ALL ON public.translations_cache TO service_role;

DROP POLICY IF EXISTS "Public read translations" ON public.translations_cache;
CREATE POLICY "Public read translations"
  ON public.translations_cache
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE FUNCTION public.set_translations_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS translations_cache_set_updated_at ON public.translations_cache;
CREATE TRIGGER translations_cache_set_updated_at
  BEFORE UPDATE ON public.translations_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.set_translations_cache_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- 20260509093543: Storage policy for seller submission photos
-- ═════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Public can upload seller submission photos" ON storage.objects;
CREATE POLICY "Public can upload seller submission photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = 'seller-submissions'
);