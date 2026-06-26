CREATE TABLE public.ai_chat_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.import_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed')),
  prompt TEXT,
  file_names TEXT[] DEFAULT '{}',
  urls TEXT[] DEFAULT '{}',
  model TEXT,
  assistant_message TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_chat_log TO authenticated;
GRANT ALL ON public.ai_chat_log TO service_role;
ALTER TABLE public.ai_chat_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view ai chat log" ON public.ai_chat_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_chat_log_created_at_idx ON public.ai_chat_log (created_at DESC);