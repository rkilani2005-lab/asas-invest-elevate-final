-- Add video URL support to seller submissions.
-- Sellers can paste a YouTube/Vimeo link (or a direct video URL) to be reviewed
-- alongside the property photos. On approval, the admin flow copies this value
-- into properties.video_url so the public listing carries it forward.
ALTER TABLE public.seller_submissions
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.seller_submissions.video_url IS
  'Optional YouTube / Vimeo / direct .mp4 URL provided by the seller. Reviewed and (on approval) propagated to properties.video_url.';
