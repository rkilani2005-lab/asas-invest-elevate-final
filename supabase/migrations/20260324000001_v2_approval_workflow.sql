-- =============================================
-- V2: Approval Workflow + Publishing Mode
-- =============================================

-- Add approval columns to import_jobs
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_review'
    CHECK (approval_status IN ('pending_review', 'approved', 'rejected', 'auto_published')),
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB,
  ADD COLUMN IF NOT EXISTS field_completeness INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]';

-- Update import_status to include pending_approval
ALTER TABLE public.import_jobs
  DROP CONSTRAINT IF EXISTS import_jobs_import_status_check;

ALTER TABLE public.import_jobs
  ADD CONSTRAINT import_jobs_import_status_check
    CHECK (import_status IN (
      'pending', 'extracting', 'reviewing',
      'pending_approval', 'processing_media', 'uploading',
      'completed', 'rejected', 'error'
    ));

-- Add publishing_mode and admin_email to importer_settings
-- (importer_settings is key-value, just insert defaults)
INSERT INTO public.importer_settings (key, value)
VALUES
  ('publishing_mode', 'manual'),
  ('admin_email', ''),
  ('content_team_email', '')
ON CONFLICT (key) DO NOTHING;

-- Index for approval queue
CREATE INDEX IF NOT EXISTS idx_import_jobs_approval ON public.import_jobs(approval_status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_import_status ON public.import_jobs(import_status);
