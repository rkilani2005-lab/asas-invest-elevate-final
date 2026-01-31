-- Phase 1: CMS Database Schema Updates

-- A1.1 Add category column to media table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media' AND column_name = 'category') THEN
    ALTER TABLE public.media ADD COLUMN category text DEFAULT 'general';
  END IF;
END $$;

-- A1.2 Add map_embed_code to properties table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'map_embed_code') THEN
    ALTER TABLE public.properties ADD COLUMN map_embed_code text;
  END IF;
END $$;

-- A1.3 Create amenity_library table for standard amenities
CREATE TABLE IF NOT EXISTS public.amenity_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text,
  icon text NOT NULL,
  category text DEFAULT 'General',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on amenity_library
ALTER TABLE public.amenity_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for amenity_library
CREATE POLICY "Anyone can view amenity library"
ON public.amenity_library FOR SELECT
USING (true);

CREATE POLICY "Admins can insert amenity library"
ON public.amenity_library FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update amenity library"
ON public.amenity_library FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete amenity library"
ON public.amenity_library FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert standard Dubai real estate amenities
INSERT INTO public.amenity_library (name_en, name_ar, icon, category) VALUES
('Swimming Pool', 'مسبح', 'waves', 'Recreation'),
('Fitness Center', 'مركز لياقة بدنية', 'dumbbell', 'Recreation'),
('24/7 Security', 'أمن على مدار الساعة', 'shield-check', 'Services'),
('Covered Parking', 'موقف سيارات مغطى', 'car', 'Facilities'),
('Children Playground', 'ملعب أطفال', 'baby', 'Recreation'),
('Concierge Service', 'خدمة الكونسيرج', 'bell-concierge', 'Services'),
('Spa & Wellness', 'سبا وعافية', 'sparkles', 'Recreation'),
('Rooftop Terrace', 'تراس على السطح', 'sun', 'Amenities'),
('BBQ Area', 'منطقة شواء', 'flame', 'Amenities'),
('High-Speed WiFi', 'واي فاي عالي السرعة', 'wifi', 'Technology'),
('Smart Home System', 'نظام المنزل الذكي', 'home', 'Technology'),
('Private Beach Access', 'وصول خاص للشاطئ', 'umbrella', 'Recreation'),
('Tennis Court', 'ملعب تنس', 'circle-dot', 'Recreation'),
('Yoga Studio', 'استوديو يوغا', 'heart', 'Recreation'),
('Business Center', 'مركز أعمال', 'briefcase', 'Services'),
('Kids Club', 'نادي أطفال', 'users', 'Recreation'),
('Valet Parking', 'خدمة صف السيارات', 'key', 'Services'),
('Pet Friendly', 'مناسب للحيوانات الأليفة', 'paw-print', 'Amenities'),
('EV Charging', 'شحن السيارات الكهربائية', 'zap', 'Facilities'),
('Jogging Track', 'مسار للجري', 'footprints', 'Recreation')
ON CONFLICT DO NOTHING;

-- B1.1 Create insights/blog table
CREATE TABLE IF NOT EXISTS public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_ar text,
  excerpt_en text,
  excerpt_ar text,
  content_en text,
  content_ar text,
  category text NOT NULL DEFAULT 'market_news',
  featured_image text,
  author_en text,
  author_ar text,
  read_time_minutes integer DEFAULT 5,
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  meta_title_en text,
  meta_title_ar text,
  meta_description_en text,
  meta_description_ar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on insights
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for insights
CREATE POLICY "Anyone can view published insights"
ON public.insights FOR SELECT
USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert insights"
ON public.insights FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update insights"
ON public.insights FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete insights"
ON public.insights FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on insights
CREATE TRIGGER update_insights_updated_at
BEFORE UPDATE ON public.insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();