
-- Phase 2: Add commercial columns to properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS license_type text,
  ADD COLUMN IF NOT EXISTS fit_out_status text,
  ADD COLUMN IF NOT EXISTS office_type text,
  ADD COLUMN IF NOT EXISTS power_load_kw text,
  ADD COLUMN IF NOT EXISTS pantry_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS washroom_type text,
  ADD COLUMN IF NOT EXISTS parking_spaces integer,
  ADD COLUMN IF NOT EXISTS parking_ratio text,
  ADD COLUMN IF NOT EXISTS projected_roi text,
  ADD COLUMN IF NOT EXISTS tenancy_status text,
  ADD COLUMN IF NOT EXISTS service_charges text;

-- Create services table
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ar text,
  description_en text,
  description_ar text,
  icon text,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can insert services" ON public.services FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update services" ON public.services FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete services" ON public.services FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create page_sections table
CREATE TABLE public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  section_key text NOT NULL,
  title_en text,
  title_ar text,
  content_en text,
  content_ar text,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page sections" ON public.page_sections FOR SELECT USING (true);
CREATE POLICY "Admins can insert page sections" ON public.page_sections FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update page sections" ON public.page_sections FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete page sections" ON public.page_sections FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default About page sections
INSERT INTO public.page_sections (page_slug, section_key, title_en, title_ar, content_en, content_ar) VALUES
('about', 'founders_note', 'A Note from Our Founder', 'كلمة من المؤسس', 'At Asas Invest, we believe real estate is not just about transactions—it is about building legacies. Our vision is to create a new standard for ethical, data-driven real estate investment in the UAE, where every client is treated as a partner in wealth creation.', 'في أساس للاستثمار، نؤمن أن العقارات ليست مجرد معاملات—بل هي بناء إرث. رؤيتنا هي خلق معيار جديد للاستثمار العقاري الأخلاقي والمبني على البيانات في الإمارات.'),
('about', 'pillar_precision', 'Precision', 'الدقة', 'Data-backed market entry points. Every recommendation is supported by comprehensive market analysis and proven performance metrics.', 'نقاط دخول السوق المدعومة بالبيانات. كل توصية مدعومة بتحليل شامل للسوق ومقاييس أداء مثبتة.'),
('about', 'pillar_access', 'Access', 'الوصول', 'Off-market opportunities and pre-launch allocations. We leverage our deep industry relationships to give you first-mover advantage.', 'فرص خارج السوق ومخصصات ما قبل الإطلاق. نستفيد من علاقاتنا العميقة في الصناعة لمنحك ميزة المبادر الأول.'),
('about', 'pillar_stewardship', 'Stewardship', 'الإشراف', 'Long-term asset management, not just transaction closing. We stay with you through the entire lifecycle of your investment.', 'إدارة الأصول على المدى الطويل، وليس مجرد إغلاق المعاملات. نبقى معك طوال دورة حياة استثمارك بالكامل.');
