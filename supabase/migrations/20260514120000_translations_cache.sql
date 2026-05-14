-- Translations cache for the AI translation fallback feature.
--
-- When a property (or any CMS field) is shown to a user in Arabic but the
-- Arabic value is missing, the frontend asks the `translate-content` edge
-- function to fill it in. The result is stored here so subsequent reads
-- return instantly without re-billing the AI gateway.
--
-- Invalidation strategy:
--   • Admin edits the AR field directly in the CMS -> CMS save handler
--     deletes the matching cache row (so the human translation wins).
--   • Source EN text changes -> the edge function checks `source_text`
--     against the cached one; on mismatch it re-translates and overwrites.
--
-- Read access is public (the translated content is meant to be displayed
-- on the public site). Writes are restricted to the service role used by
-- the edge function.

CREATE TABLE IF NOT EXISTS public.translations_cache (
  cache_key       TEXT PRIMARY KEY,        -- e.g. "property:abc-123:name"
  source_locale   TEXT NOT NULL DEFAULT 'en',
  target_locale   TEXT NOT NULL,            -- 'ar' (or future locales)
  source_text     TEXT NOT NULL,            -- exact source at translation time
  translated_text TEXT NOT NULL,
  model           TEXT,                     -- 'google/gemini-2.5-flash' etc.
  auto            BOOLEAN NOT NULL DEFAULT TRUE,  -- false = human-curated
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

-- RLS: anyone can read (the translated content is public),
-- only the service role can write (the edge function uses it).
ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read translations"
  ON public.translations_cache
  FOR SELECT
  TO public
  USING (true);

-- No INSERT/UPDATE/DELETE policies = only service role can write.
-- The edge function uses the service role key explicitly.

-- updated_at trigger
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
