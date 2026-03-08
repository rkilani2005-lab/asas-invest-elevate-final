
-- Import jobs table (tracks each property import run)
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dropbox_folder_path TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  name_en TEXT,
  name_ar TEXT,
  slug TEXT,
  tagline_en TEXT,
  tagline_ar TEXT,
  developer_en TEXT,
  developer_ar TEXT,
  location_en TEXT,
  location_ar TEXT,
  price_range TEXT,
  size_range TEXT,
  unit_types TEXT,
  ownership_type TEXT,
  type TEXT CHECK (type IN ('off-plan', 'ready')),
  handover_date DATE,
  overview_en TEXT,
  overview_ar TEXT,
  highlights_en TEXT,
  highlights_ar TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  is_featured BOOLEAN DEFAULT true,
  investment_en TEXT,
  investment_ar TEXT,
  enduser_text_en TEXT,
  enduser_text_ar TEXT,
  import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'extracting', 'reviewing', 'processing_media', 'uploading', 'completed', 'error')),
  cms_property_id TEXT,
  cms_url TEXT,
  ai_extraction_raw JSONB,
  error_log TEXT,
  pdf_count INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Media files queue for each import job
CREATE TABLE public.import_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'brochure')),
  original_filename TEXT NOT NULL,
  original_size_bytes BIGINT,
  compressed_size_bytes BIGINT,
  dropbox_path TEXT,
  storage_url TEXT,
  cms_media_id TEXT,
  sort_order INTEGER DEFAULT 0,
  is_hero BOOLEAN DEFAULT false,
  compression_status TEXT DEFAULT 'pending' CHECK (compression_status IN ('pending', 'compressing', 'done', 'skipped', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Import activity logs
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  level TEXT DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App settings (API keys, config)
CREATE TABLE public.importer_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_import_jobs_status ON public.import_jobs(import_status);
CREATE INDEX idx_import_media_job_id ON public.import_media(job_id);
CREATE INDEX idx_import_logs_job_id ON public.import_logs(job_id);

-- Updated_at trigger for import_jobs
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importer_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access importer tables
CREATE POLICY "Admins can manage import jobs" ON public.import_jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage import media" ON public.import_media
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage import logs" ON public.import_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage importer settings" ON public.importer_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
