-- Raise the property-media bucket upload limit to 50 MB so the AI Property Chat
-- can accept larger brochures/videos. (Effective limit is the min of this and
-- the project-level upload limit, which defaults to 50 MB.)
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50 * 1024 * 1024 bytes
WHERE id = 'property-media';
