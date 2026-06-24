
-- 1. Publish status enum
DO $$ BEGIN
  CREATE TYPE public.publish_status AS ENUM ('active','draft','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Properties columns
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS publish_status public.publish_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_start_date date,
  ADD COLUMN IF NOT EXISTS publish_expiry_date date;

-- Backfill existing properties to active so site doesn't go dark
UPDATE public.properties SET publish_status = 'active' WHERE publish_status = 'draft';

CREATE INDEX IF NOT EXISTS idx_properties_publish_status ON public.properties(publish_status);
CREATE INDEX IF NOT EXISTS idx_properties_publish_expiry ON public.properties(publish_expiry_date);

-- 3. Views tracking
CREATE TABLE IF NOT EXISTS public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  session_id text,
  user_agent text,
  referrer text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.property_views TO anon, authenticated;
GRANT SELECT ON public.property_views TO authenticated;
GRANT ALL ON public.property_views TO service_role;
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
  ON public.property_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    property_id IS NOT NULL
    AND (session_id IS NULL OR length(session_id) <= 100)
    AND (user_agent IS NULL OR length(user_agent) <= 500)
    AND (referrer IS NULL OR length(referrer) <= 1000)
  );

CREATE POLICY "Admins can read views"
  ON public.property_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_property_views_property ON public.property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON public.property_views(viewed_at DESC);

-- 4. Downloads tracking
CREATE TABLE IF NOT EXISTS public.property_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  asset_kind text NOT NULL,
  session_id text,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.property_downloads TO anon, authenticated;
GRANT SELECT ON public.property_downloads TO authenticated;
GRANT ALL ON public.property_downloads TO service_role;
ALTER TABLE public.property_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a download"
  ON public.property_downloads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    property_id IS NOT NULL
    AND asset_kind IN ('brochure','floor_plan','plate','other')
    AND (session_id IS NULL OR length(session_id) <= 100)
  );

CREATE POLICY "Admins can read downloads"
  ON public.property_downloads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_property_downloads_property ON public.property_downloads(property_id);
CREATE INDEX IF NOT EXISTS idx_property_downloads_at ON public.property_downloads(downloaded_at DESC);

-- 5. Auto-expire function + daily cron
CREATE OR REPLACE FUNCTION public.expire_outdated_properties()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.properties
  SET publish_status = 'expired'
  WHERE publish_status = 'active'
    AND publish_expiry_date IS NOT NULL
    AND publish_expiry_date < CURRENT_DATE;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-properties-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'expire-properties-daily',
  '5 0 * * *',
  $$ SELECT public.expire_outdated_properties(); $$
);
