-- AI Property Chat history: one row per extraction attempt (success or failure).
CREATE TABLE IF NOT EXISTS public.ai_chat_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success','failed')),
  prompt text,
  file_names jsonb DEFAULT '[]'::jsonb,
  urls jsonb DEFAULT '[]'::jsonb,
  job_id uuid REFERENCES public.import_jobs(id) ON DELETE SET NULL,
  assistant_message text,
  error text,
  model text
);

ALTER TABLE public.ai_chat_log ENABLE ROW LEVEL SECURITY;

-- The edge function writes via the service role (bypasses RLS). Admins can read.
CREATE POLICY "Admins can read ai chat log"
  ON public.ai_chat_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.ai_chat_log TO authenticated;
GRANT ALL ON public.ai_chat_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_ai_chat_log_created ON public.ai_chat_log(created_at DESC);
