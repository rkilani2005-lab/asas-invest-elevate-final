-- Reset all jobs that have 0 files so they get properly rescanned
UPDATE import_jobs 
SET import_status = 'pending', updated_at = '2020-01-01T00:00:00Z'
WHERE (pdf_count = 0 OR pdf_count IS NULL) 
  AND (image_count = 0 OR image_count IS NULL)
  AND import_status IN ('pending', 'extracting', 'reviewing');