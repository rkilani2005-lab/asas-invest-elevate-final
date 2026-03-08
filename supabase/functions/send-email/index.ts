import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailParams {
  submission_id: string;
  form_type: string;
  visitor_name?: string;
  visitor_email: string;
  visitor_phone?: string;
  visitor_message?: string;
  preferred_language?: string;
  property_name?: string;
  property_id?: string;
  viewing_date?: string;
  viewing_time?: string;
  callback_time?: string;
  budget_range?: string;
  unit_type_interest?: string;
  purpose?: string;
  team_email: string;
  gmail_account?: {
    access_token?: string;
    refresh_token?: string;
    email: string;
    token_expiry?: string;
  } | null;
}

async function refreshGmailToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await resp.json();
  return data.access_token || null;
}

function buildMimeMessage(params: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const lines = [
    `From: "${params.fromName}" <${params.from}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    params.replyTo ? `Reply-To: ${params.replyTo}` : "",
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    params.text,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    "",
    params.html,
    "",
    `--${boundary}--`,
  ].filter((l) => l !== undefined);

  return btoa(unescape(encodeURIComponent(lines.join("\r\n"))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string
): Promise<{ messageId: string; threadId: string } | null> {
  const raw = buildMimeMessage({
    from,
    fromName: "ASAS Real Estate",
    to,
    subject,
    html,
    text,
    replyTo,
  });

  const resp = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Gmail API error:", err);
    return null;
  }

  const result = await resp.json();
  return { messageId: result.id, threadId: result.threadId };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

function visitorConfirmationHtml(
  formType: string,
  vars: Record<string, string>,
  lang: string
): { subject: string; html: string; text: string } {
  const isAr = lang === "ar";
  const dir = isAr ? 'dir="rtl"' : "";

  const templates: Record<string, { subject: string; html: string; text: string }> = {
    contact: {
      subject: isAr
        ? "شكراً لتواصلك مع أساس | Thank you for contacting ASAS"
        : "Thank you for contacting ASAS | شكراً لتواصلك مع أساس",
      html: `
<html><body ${dir} style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Dear ${vars.visitor_name || "Valued Client"},</h2>
    <p style="color:#555;line-height:1.7;">Thank you for reaching out to ASAS. We have received your message and our team will get back to you within <strong>24 hours</strong>.</p>
    ${vars.visitor_message ? `<div style="background:#f9f9f9;border-left:4px solid #c9a84c;padding:15px;margin:20px 0;border-radius:4px;"><p style="margin:0;color:#666;font-style:italic;">"${vars.visitor_message}"</p></div>` : ""}
    <p style="color:#555;line-height:1.7;">If you need immediate assistance, please call us at <a href="tel:+97141234567" style="color:#c9a84c;">+971 4 123 4567</a>.</p>
    <div style="margin:30px 0;text-align:center;">
      <a href="https://asas.ae/properties" style="background:#c9a84c;color:#fff;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Browse Properties →</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;line-height:1.8;">
      <strong>ASAS Real Estate</strong><br>
      Dubai, United Arab Emirates<br>
      <a href="mailto:info@asas.ae" style="color:#c9a84c;">info@asas.ae</a> | <a href="https://asas.ae" style="color:#c9a84c;">asas.ae</a>
    </p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Dear ${vars.visitor_name || "Valued Client"},\n\nThank you for contacting ASAS. We have received your message and will respond within 24 hours.\n\nASAS Real Estate | info@asas.ae | asas.ae`,
    },
    property_inquiry: {
      subject: isAr
        ? `تفاصيل عقار ${vars.property_name || ""} | Property Details`
        : `${vars.property_name || "Property"} — Your Requested Details`,
      html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Dear ${vars.visitor_name || "Valued Client"},</h2>
    <p style="color:#555;line-height:1.7;">Thank you for your interest in <strong style="color:#1a1a2e;">${vars.property_name || "our property"}</strong>. Our dedicated sales team will contact you shortly with detailed information.</p>
    ${vars.budget_range ? `<p style="color:#555;">Budget range noted: <strong>${vars.budget_range}</strong></p>` : ""}
    ${vars.unit_type_interest ? `<p style="color:#555;">Unit types of interest: <strong>${vars.unit_type_interest}</strong></p>` : ""}
    <div style="background:#f9f6ef;border:1px solid #e8d9b0;border-radius:8px;padding:20px;margin:25px 0;">
      <h3 style="color:#c9a84c;margin-top:0;">Next Steps</h3>
      <ul style="color:#555;line-height:2;padding-left:20px;">
        <li>Our consultant will call you within <strong>24 hours</strong></li>
        <li>Receive a personalised property proposal</li>
        <li>Schedule an exclusive viewing</li>
      </ul>
    </div>
    <div style="margin:30px 0;text-align:center;">
      <a href="https://asas.ae/properties" style="background:#c9a84c;color:#fff;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View All Properties →</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">ASAS Real Estate | <a href="mailto:sales@asas.ae" style="color:#c9a84c;">sales@asas.ae</a> | <a href="https://asas.ae" style="color:#c9a84c;">asas.ae</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Dear ${vars.visitor_name || "Valued Client"},\n\nThank you for your interest in ${vars.property_name || "our property"}. Our team will contact you within 24 hours.\n\nASAS Real Estate | sales@asas.ae`,
    },
    schedule_viewing: {
      subject: `Viewing Confirmed — ${vars.property_name || "Property"} | تم تأكيد موعد المعاينة`,
      html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Viewing Request Received</h2>
    <p style="color:#555;line-height:1.7;">Dear ${vars.visitor_name || "Valued Client"},<br>Your viewing request has been received and our team will confirm the appointment shortly.</p>
    <div style="background:#f9f6ef;border:1px solid #e8d9b0;border-radius:8px;padding:20px;margin:25px 0;">
      <h3 style="color:#1a1a2e;margin-top:0;font-size:16px;">📋 Viewing Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#888;font-size:14px;">Property</td><td style="padding:8px 0;color:#333;font-weight:bold;">${vars.property_name || "—"}</td></tr>
        ${vars.viewing_date ? `<tr><td style="padding:8px 0;color:#888;font-size:14px;">Preferred Date</td><td style="padding:8px 0;color:#333;">${vars.viewing_date}</td></tr>` : ""}
        ${vars.viewing_time ? `<tr><td style="padding:8px 0;color:#888;font-size:14px;">Preferred Time</td><td style="padding:8px 0;color:#333;">${vars.viewing_time}</td></tr>` : ""}
      </table>
    </div>
    <p style="color:#555;line-height:1.7;">Our sales team will confirm your appointment and provide location details. If you need to reach us sooner, call <a href="tel:+97141234567" style="color:#c9a84c;">+971 4 123 4567</a>.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">ASAS Real Estate | <a href="mailto:sales@asas.ae" style="color:#c9a84c;">sales@asas.ae</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Dear ${vars.visitor_name},\n\nYour viewing request for ${vars.property_name || "our property"} has been received. We will confirm the appointment shortly.\n\nASAS Real Estate | sales@asas.ae`,
    },
    callback: {
      subject: `We'll Call You Shortly | سنتصل بك قريباً`,
      html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Callback Requested ✅</h2>
    <p style="color:#555;line-height:1.7;">Dear ${vars.visitor_name || "Valued Client"},<br>We've received your callback request. A member of our team will call you at <strong>${vars.visitor_phone || "the number provided"}</strong> within the next <strong>2 hours</strong> during business hours (Sun–Thu, 9 AM – 6 PM GST).</p>
    ${vars.callback_time ? `<p style="color:#555;">Your preferred time: <strong>${vars.callback_time}</strong></p>` : ""}
    <p style="color:#555;">If urgent, call us directly at <a href="tel:+97141234567" style="color:#c9a84c;">+971 4 123 4567</a>.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">ASAS Real Estate | <a href="mailto:sales@asas.ae" style="color:#c9a84c;">sales@asas.ae</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Dear ${vars.visitor_name},\n\nWe've received your callback request and will call ${vars.visitor_phone} within 2 hours.\n\nASAS Real Estate`,
    },
    newsletter: {
      subject: `Welcome to ASAS — Dubai's Finest Properties | مرحباً بك في أساس`,
      html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Welcome to the ASAS Community</h2>
    <p style="color:#555;line-height:1.7;">Dear ${vars.visitor_name || "Valued Client"},<br>Thank you for subscribing. You'll receive curated updates on Dubai's most exclusive properties, market insights, and early access to new launches.</p>
    <div style="margin:30px 0;text-align:center;">
      <a href="https://asas.ae/properties" style="background:#c9a84c;color:#fff;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Browse All Properties →</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">ASAS Real Estate | <a href="https://asas.ae" style="color:#c9a84c;">asas.ae</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Welcome to ASAS! You're now subscribed to receive exclusive Dubai property updates.\n\nASAS Real Estate | asas.ae`,
    },
    brochure_download: {
      subject: `Your Brochure — ${vars.property_name || "ASAS Property"}`,
      html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:28px;letter-spacing:2px;">ASAS</h1>
    <p style="color:#fff;margin:5px 0 0;font-size:13px;">REAL ESTATE</p>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Thank You for Your Interest</h2>
    <p style="color:#555;line-height:1.7;">Dear ${vars.visitor_name || "Valued Client"},<br>Thank you for requesting the brochure for <strong>${vars.property_name || "our property"}</strong>. Our team will send you the full brochure shortly.</p>
    <div style="margin:30px 0;text-align:center;">
      <a href="https://asas.ae/properties" style="background:#c9a84c;color:#fff;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View Property Online →</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">ASAS Real Estate | <a href="mailto:sales@asas.ae" style="color:#c9a84c;">sales@asas.ae</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      text: `Dear ${vars.visitor_name},\n\nThank you for requesting information about ${vars.property_name}. Our team will follow up shortly.\n\nASAS Real Estate`,
    },
  };

  return templates[formType] || templates["contact"];
}

function teamAlertHtml(
  formType: string,
  vars: Record<string, string>,
  submissionId: string
): { subject: string; html: string; text: string } {
  const typeLabel: Record<string, string> = {
    contact: "📩 General Inquiry",
    property_inquiry: "🏢 Property Inquiry",
    schedule_viewing: "📅 Viewing Request",
    callback: "📞 CALLBACK REQUEST",
    newsletter: "📧 Newsletter Signup",
    brochure_download: "📥 Brochure Download",
  };

  const label = typeLabel[formType] || "New Submission";
  const priority = formType === "callback" ? "⚠️ HIGH PRIORITY — " : "";
  const adminUrl = `https://asas.ae/admin/communications`;

  return {
    subject: `${priority}${label} — ${vars.visitor_name || vars.visitor_email}`,
    html: `
<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 15px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a1a2e;padding:20px 30px;text-align:left;">
    <span style="color:#c9a84c;font-size:13px;font-weight:bold;letter-spacing:1px;">ASAS CMS NOTIFICATION</span>
    <h2 style="color:#fff;margin:5px 0 0;font-size:20px;">${label}</h2>
  </td></tr>
  <tr><td style="padding:30px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f9f9f9;"><td style="padding:10px 12px;font-size:13px;color:#888;width:140px;">Name</td><td style="padding:10px 12px;font-size:14px;color:#333;font-weight:bold;">${vars.visitor_name || "—"}</td></tr>
      <tr><td style="padding:10px 12px;font-size:13px;color:#888;">Email</td><td style="padding:10px 12px;font-size:14px;color:#333;"><a href="mailto:${vars.visitor_email}" style="color:#c9a84c;">${vars.visitor_email}</a></td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:10px 12px;font-size:13px;color:#888;">Phone</td><td style="padding:10px 12px;font-size:14px;color:#333;">${vars.visitor_phone || "—"}</td></tr>
      ${vars.property_name ? `<tr><td style="padding:10px 12px;font-size:13px;color:#888;">Property</td><td style="padding:10px 12px;font-size:14px;color:#333;font-weight:bold;">${vars.property_name}</td></tr>` : ""}
      ${vars.viewing_date ? `<tr style="background:#f9f9f9;"><td style="padding:10px 12px;font-size:13px;color:#888;">Viewing Date</td><td style="padding:10px 12px;font-size:14px;color:#333;">${vars.viewing_date} ${vars.viewing_time || ""}</td></tr>` : ""}
      ${vars.callback_time ? `<tr><td style="padding:10px 12px;font-size:13px;color:#888;">Best Time</td><td style="padding:10px 12px;font-size:14px;color:#c9a84c;font-weight:bold;">${vars.callback_time}</td></tr>` : ""}
      ${vars.budget_range ? `<tr style="background:#f9f9f9;"><td style="padding:10px 12px;font-size:13px;color:#888;">Budget</td><td style="padding:10px 12px;font-size:14px;color:#333;">${vars.budget_range}</td></tr>` : ""}
      ${vars.visitor_message ? `<tr><td style="padding:10px 12px;font-size:13px;color:#888;vertical-align:top;">Message</td><td style="padding:10px 12px;font-size:14px;color:#333;font-style:italic;">"${vars.visitor_message}"</td></tr>` : ""}
    </table>
    <div style="margin:25px 0;text-align:center;">
      <a href="${adminUrl}" style="background:#1a1a2e;color:#c9a84c;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;border:1px solid #c9a84c;">View in Admin Panel →</a>
    </div>
  </td></tr>
</table></td></tr></table>
</body></html>`,
    text: `NEW ${label}\n\nName: ${vars.visitor_name}\nEmail: ${vars.visitor_email}\nPhone: ${vars.visitor_phone || "—"}\nProperty: ${vars.property_name || "—"}\nMessage: ${vars.visitor_message || "—"}\n\nView: ${adminUrl}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const params: EmailParams = await req.json();
    const {
      submission_id,
      form_type,
      visitor_name = "",
      visitor_email,
      visitor_phone = "",
      visitor_message = "",
      preferred_language = "en",
      property_name = "",
      viewing_date = "",
      viewing_time = "",
      callback_time = "",
      budget_range = "",
      unit_type_interest = "",
      team_email,
      gmail_account,
    } = params;

    const vars: Record<string, string> = {
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message,
      property_name,
      viewing_date,
      viewing_time,
      callback_time,
      budget_range,
      unit_type_interest,
    };

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    // ---- VISITOR CONFIRMATION ----
    const visitorEmail = visitorConfirmationHtml(form_type, vars, preferred_language);

    let gmailResult: { messageId: string; threadId: string } | null = null;
    let accessToken = gmail_account?.access_token;

    // Try to refresh token if expired or missing
    if (!accessToken && gmail_account?.refresh_token && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      accessToken = await refreshGmailToken(
        gmail_account.refresh_token,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      ) || undefined;

      if (accessToken) {
        await supabase
          .from("gmail_accounts")
          .update({ access_token: accessToken, token_expiry: new Date(Date.now() + 3600000).toISOString() })
          .eq("email", gmail_account.email);
      }
    }

    const senderEmail = gmail_account?.email || "noreply@asas.ae";

    if (accessToken) {
      gmailResult = await sendViaGmail(
        accessToken,
        senderEmail,
        visitor_email,
        visitorEmail.subject,
        visitorEmail.html,
        visitorEmail.text
      );
    }

    // Log visitor email
    await supabase.from("email_log").insert({
      submission_id,
      template_name: `${form_type}_visitor_confirmation`,
      sender_email: senderEmail,
      recipient_email: visitor_email,
      recipient_type: "visitor",
      subject: visitorEmail.subject,
      body_html: visitorEmail.html,
      body_text: visitorEmail.text,
      gmail_message_id: gmailResult?.messageId || null,
      gmail_thread_id: gmailResult?.threadId || null,
      status: gmailResult ? "sent" : accessToken ? "failed" : "queued",
      sent_at: gmailResult ? new Date().toISOString() : null,
      error_message: !gmailResult && accessToken ? "Gmail API call failed" : null,
    });

    // ---- TEAM ALERT ----
    const teamAlert = teamAlertHtml(form_type, vars, submission_id);
    let teamGmailResult: { messageId: string; threadId: string } | null = null;

    if (accessToken) {
      teamGmailResult = await sendViaGmail(
        accessToken,
        senderEmail,
        team_email,
        teamAlert.subject,
        teamAlert.html,
        teamAlert.text,
        visitor_email // reply-to visitor
      );
    }

    await supabase.from("email_log").insert({
      submission_id,
      template_name: `${form_type}_team_alert`,
      sender_email: senderEmail,
      recipient_email: team_email,
      recipient_type: "team",
      subject: teamAlert.subject,
      body_html: teamAlert.html,
      body_text: teamAlert.text,
      gmail_message_id: teamGmailResult?.messageId || null,
      gmail_thread_id: teamGmailResult?.threadId || null,
      status: teamGmailResult ? "sent" : accessToken ? "failed" : "queued",
      sent_at: teamGmailResult ? new Date().toISOString() : null,
    });

    // Update submission as emailed
    await supabase
      .from("form_submissions")
      .update({
        email_sent: gmailResult !== null,
        email_sent_at: new Date().toISOString(),
        team_notified: teamGmailResult !== null,
      })
      .eq("id", submission_id);

    // Schedule Day-3 and Day-7 follow-ups for property inquiries
    if (form_type === "property_inquiry") {
      const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const day7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("scheduled_emails").insert([
        {
          submission_id,
          template_name: "property_inquiry_followup_day3",
          recipient_email: visitor_email,
          scheduled_for: day3,
          variables: { visitor_name, property_name, visitor_email },
        },
        {
          submission_id,
          template_name: "property_inquiry_followup_day7",
          recipient_email: visitor_email,
          scheduled_for: day7,
          variables: { visitor_name, property_name, visitor_email },
        },
      ]);
    }

    return new Response(
      JSON.stringify({ success: true, gmail_sent: !!gmailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
