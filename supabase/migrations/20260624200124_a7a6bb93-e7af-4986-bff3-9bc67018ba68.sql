
-- 1. Restrict agents SELECT to authenticated users only (was public)
DROP POLICY IF EXISTS "Anyone can view active agents" ON public.agents;
CREATE POLICY "Authenticated users can view active agents"
  ON public.agents
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. Remove form_submissions from Realtime publication to stop PII broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'form_submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.form_submissions';
  END IF;
END$$;
