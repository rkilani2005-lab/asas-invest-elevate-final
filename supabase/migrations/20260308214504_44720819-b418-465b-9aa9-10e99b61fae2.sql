
-- =============================================
-- AGENTS TABLE
-- =============================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'agent',
  is_active BOOLEAN DEFAULT true,
  properties_assigned UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active agents" ON public.agents FOR SELECT USING (is_active = true);

-- =============================================
-- FORM_SUBMISSIONS TABLE
-- =============================================
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL CHECK (form_type IN ('contact','property_inquiry','schedule_viewing','callback','newsletter','brochure_download')),
  visitor_name TEXT,
  visitor_email TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_message TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en','ar')),
  preferred_contact TEXT DEFAULT 'email' CHECK (preferred_contact IN ('email','phone','whatsapp')),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  property_name TEXT,
  unit_type_interest TEXT,
  budget_range TEXT,
  purpose TEXT,
  viewing_date DATE,
  viewing_time TEXT,
  viewing_alt_date DATE,
  attendees INTEGER DEFAULT 1,
  callback_time TEXT,
  newsletter_interests TEXT,
  subject TEXT,
  consent_given BOOLEAN DEFAULT false,
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','in_progress','converted','closed','spam')),
  follow_up_date DATE,
  notes TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  team_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit forms" ON public.form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all submissions" ON public.form_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update submissions" ON public.form_submissions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete submissions" ON public.form_submissions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_form_submissions_email ON public.form_submissions(visitor_email);
CREATE INDEX idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX idx_form_submissions_created ON public.form_submissions(created_at DESC);

-- =============================================
-- EMAIL_TEMPLATES TABLE
-- =============================================
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  subject_en TEXT NOT NULL,
  subject_ar TEXT,
  body_html_en TEXT NOT NULL,
  body_html_ar TEXT,
  body_text_en TEXT,
  sender_account TEXT NOT NULL DEFAULT 'info',
  category TEXT CHECK (category IN ('confirmation','notification','follow_up','marketing','alert','manual')),
  variables_used TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active email templates" ON public.email_templates FOR SELECT USING (is_active = true);

-- =============================================
-- EMAIL_LOG TABLE
-- =============================================
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.form_submissions(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('visitor','team','agent')),
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','opened','clicked','bounced','failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email log" ON public.email_log FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_email_log_submission ON public.email_log(submission_id);
CREATE INDEX idx_email_log_created ON public.email_log(created_at DESC);

-- =============================================
-- SCHEDULED_EMAILS TABLE
-- =============================================
CREATE TABLE public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  variables JSONB DEFAULT '{}',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','cancelled','failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage scheduled emails" ON public.scheduled_emails FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_scheduled_emails_due ON public.scheduled_emails(status, scheduled_for);

-- =============================================
-- GMAIL_ACCOUNTS TABLE
-- =============================================
CREATE TABLE public.gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('sales','info','noreply','support','manual')),
  display_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage gmail accounts" ON public.gmail_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- NEWSLETTER_SUBSCRIBERS TABLE
-- =============================================
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  interests TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  unsubscribe_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage newsletter subscribers" ON public.newsletter_subscribers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gmail_accounts_updated_at
  BEFORE UPDATE ON public.gmail_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- REALTIME on form_submissions
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_submissions;
