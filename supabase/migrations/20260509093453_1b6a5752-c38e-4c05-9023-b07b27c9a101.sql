
CREATE TABLE public.seller_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  seller_name TEXT NOT NULL,
  seller_email TEXT NOT NULL,
  seller_phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  property_name_en TEXT NOT NULL,
  property_name_ar TEXT,
  category TEXT NOT NULL DEFAULT 'residential', -- residential | commercial
  unit_type TEXT, -- apartment | villa | townhouse | penthouse | office | retail | warehouse
  location_en TEXT,
  location_ar TEXT,
  developer_en TEXT,
  developer_ar TEXT,
  bedrooms TEXT,
  bathrooms TEXT,
  size_sqft TEXT,
  price_aed TEXT,
  description_en TEXT,
  description_ar TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_property_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a listing"
ON public.seller_submissions FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view seller submissions"
ON public.seller_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update seller submissions"
ON public.seller_submissions FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete seller submissions"
ON public.seller_submissions FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seller_submissions_updated_at
BEFORE UPDATE ON public.seller_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seller_submissions_status ON public.seller_submissions(status);
CREATE INDEX idx_seller_submissions_created_at ON public.seller_submissions(created_at DESC);
