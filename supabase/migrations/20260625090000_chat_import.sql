-- AI Chat Import — additive columns on import_jobs
-- Lets the new admin "AI Property Chat" entry point reuse the existing
-- import_jobs draft + review/publish pipeline (status 'reviewing').
-- All columns are additive and nullable — no change to existing Drive flow.

-- Distinguishes how a draft was created: 'gdrive' (existing scan) | 'chat' (AI upload box)
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'gdrive';

-- Conversation transcript for the chat importer (array of {role, content, ts})
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb;

-- Things the AI could NOT extract and is asking the admin to provide manually
-- e.g. { "fields": ["price_range"], "images_needed": 3, "notes": "..." }
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS manual_todo JSONB DEFAULT '{}'::jsonb;

-- The raw inputs the admin supplied (pasted text, URLs, uploaded file refs)
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS chat_sources JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_import_jobs_source_type ON public.import_jobs(source_type);
