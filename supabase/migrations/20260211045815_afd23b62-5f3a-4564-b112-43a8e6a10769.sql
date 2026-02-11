-- Add category enum
CREATE TYPE public.property_category AS ENUM ('residential', 'commercial');

-- Add category column to properties
ALTER TABLE public.properties 
ADD COLUMN category public.property_category NOT NULL DEFAULT 'residential';