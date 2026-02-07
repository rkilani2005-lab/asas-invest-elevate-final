-- Add file_size column to media table for tracking uploaded image sizes
ALTER TABLE public.media ADD COLUMN file_size bigint NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.media.file_size IS 'File size in bytes';