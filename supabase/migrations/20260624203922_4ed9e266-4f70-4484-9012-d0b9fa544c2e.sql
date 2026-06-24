
-- 1) agents: restrict SELECT to admins only (PII protection)
DROP POLICY IF EXISTS "Authenticated users can view active agents" ON public.agents;
CREATE POLICY "Admins can view agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) form_submissions: replace WITH CHECK (true) with validation
DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;
CREATE POLICY "Anyone can submit forms"
  ON public.form_submissions FOR INSERT
  TO public
  WITH CHECK (
    form_type IS NOT NULL
    AND length(form_type) BETWEEN 1 AND 64
    AND visitor_email IS NOT NULL
    AND length(visitor_email) BETWEEN 3 AND 320
    AND visitor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (visitor_name IS NULL OR length(visitor_name) <= 200)
    AND (visitor_phone IS NULL OR length(visitor_phone) <= 40)
    AND (visitor_message IS NULL OR length(visitor_message) <= 5000)
  );

-- 3) inquiries: replace WITH CHECK (true) with validation
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
CREATE POLICY "Anyone can submit inquiries"
  ON public.inquiries FOR INSERT
  TO public
  WITH CHECK (
    name IS NOT NULL
    AND length(name) BETWEEN 2 AND 200
    AND email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (phone IS NULL OR length(phone) <= 40)
    AND (message IS NULL OR length(message) <= 5000)
  );
