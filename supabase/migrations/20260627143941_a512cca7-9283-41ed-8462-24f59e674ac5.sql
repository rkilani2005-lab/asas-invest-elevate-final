DROP POLICY IF EXISTS "spotlight_events_anon_insert" ON public.spotlight_events;

CREATE POLICY "spotlight_events_anon_insert"
ON public.spotlight_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  spotlight_id IS NOT NULL
  AND event_type = ANY (ARRAY['impression','play','click_through','progress_25','progress_50','progress_75','progress_100'])
  AND surface = ANY (ARRAY['home','archive','property'])
  AND locale = ANY (ARRAY['en','ar'])
  AND (session_id IS NULL OR length(session_id) <= 128)
);