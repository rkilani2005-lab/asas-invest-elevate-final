-- Raise the property-media bucket upload limit to 200 MB.
-- (Effective limit is the min of this and the project-level upload limit, so the
-- project's global Storage upload limit must also be set to >= 200 MB.)
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200 * 1024 * 1024 bytes
WHERE id = 'property-media';
