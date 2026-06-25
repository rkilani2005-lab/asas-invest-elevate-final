ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'gdrive';
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS manual_todo JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS chat_sources JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_import_jobs_source_type ON public.import_jobs(source_type);