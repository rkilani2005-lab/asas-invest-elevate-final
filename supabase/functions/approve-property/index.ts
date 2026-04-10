/**
 * ASAS Approve/Reject Property — V2
 * Admin calls this to approve (→ publish) or reject (→ notify content team) a pending import job.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildEmailHtml(subject: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;background:#f5f0e8;margin:0;padding:0}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:#1a1a1a;padding:28px 32px}.header h1{color:#c9a96e;font-size:20px;margin:0}
    .body{padding:32px}.body p{color:#2c2c2c;line-height:1.7;margin:0 0 16px}
    .label{font-size:11px;font-weight:700;color:#7a7a7a;text-transform:uppercase;letter-spacing:.5px}
    .value{color:#1a1a1a;font-size:15px;font-weight:600;margin-bottom:16px}
    .btn{display:inline-block;background:#c9a96e;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px}
    .footer{background:#f5f0e8;padding:16px 32px;font-size:11px;color:#7a7a7a}
    .divider{border:none;border-top:1px solid #e8e0d0;margin:24px 0}
    .warn-box{background:#fff8e1;border-left:4px solid #c9a96e;padding:12px 16px;border-radius:0 4px 4px 0;margin:16px 0}
    .err-box{background:#fff1f0;border-left:4px solid #e53e3e;padding:12px 16px;border-radius:0 4px 4px 0;margin:16px 0}
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>ASAS Property System</h1></div>
    <div class="body">${body}</div>
    <div class="footer">© ASAS Invest · This is an automated message from the Property Import System</div>
  </div></body></html>`;
}

async function sendGmailNotification(
  supabase: ReturnType<typeof createClient>,
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> {
  // Get a connected Gmail account (prefer noreply)
  const { data: gmailRows } = await supabase
    .from("gmail_accounts")
    .select("email, access_token, refresh_token, token_expiry")
    .eq("is_connected", true)
    .order("purpose")
    .limit(1);

  const gmailAccount = gmailRows?.[0] as any;
  if (!gmailAccount?.access_token) return;

  const GCI = Deno.env.get("GMAIL_CLIENT_ID") || Deno.env.get("GOOGLE_CLIENT_ID");
  const GCS = Deno.env.get("GMAIL_CLIENT_SECRET") || Deno.env.get("GOOGLE_CLIENT_SECRET");

  let token = gmailAccount.access_token;
  const expiry = gmailAccount.token_expiry ? new Date(gmailAccount.token_expiry).getTime() : 0;
  if (Date.now() > expiry - 5 * 60 * 1000 && gmailAccount.refresh_token && GCI && GCS) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: GCI, client_secret: GCS, refresh_token: gmailAccount.refresh_token, grant_type: "refresh_token" }),
    });
    if (r.ok) { const t = await r.json(); token = t.access_token; }
  }

  const boundary = `boundary_${Date.now()}`;
  const raw = [
    `From: "ASAS Property System" <${gmailAccount.email}>`,
    `To: ${to}`, `Subject: ${subject}`, `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, `Content-Type: text/plain; charset="UTF-8"`, "", textBody, "",
    `--${boundary}`, `Content-Type: text/html; charset="UTF-8"`, "", htmlBody, "",
    `--${boundary}--`,
  ].join("\r\n");

  const encoded = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
}

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { job_id, action, review_notes, reviewed_by } = await req.json();
    if (!job_id || !action) return new Response(JSON.stringify({ error: "Missing job_id or action" }), { status: 400, headers: corsHeaders });
    if (!["approve", "reject"].includes(action)) return new Response(JSON.stringify({ error: "action must be approve or reject" }), { status: 400, headers: corsHeaders });

    // Fetch the job
    const { data: job, error: jobErr } = await supabase.from("import_jobs").select("*").eq("id", job_id).single();
    if (jobErr || !job) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: corsHeaders });

    const propertyName = job.name_en || job.folder_name;
    const location = job.location_en || "";
    const now = new Date().toISOString();

    // ── APPROVE ────────────────────────────────────────────────────────────────
    if (action === "approve") {
      await supabase.from("import_jobs").update({
        approval_status: "approved",
        import_status: "reviewing", // stays reviewing until publish-property runs
        reviewed_by: reviewed_by || "admin",
        reviewed_at: now,
        review_notes: review_notes || null,
      }).eq("id", job_id);

      await supabase.from("import_logs").insert({
        job_id, action: "approved",
        details: `Approved by ${reviewed_by || "admin"}${review_notes ? `: ${review_notes}` : ""}`,
        level: "success",
      });

      // Notify content team
      const { data: emailRow } = await supabase.from("importer_settings").select("value").eq("key", "content_team_email").maybeSingle() as any;
      const teamEmail = emailRow?.value || ((await supabase.from("importer_settings").select("value").eq("key", "admin_email").maybeSingle()) as any).data?.value;
      if (teamEmail) {
        const html = buildEmailHtml(
          `Property Approved: ${propertyName}`,
          `<p>The following property has been <strong style="color:#2e7d32">approved</strong> and is now being published to the ASAS website.</p>
          <p class="label">Property</p><p class="value">${propertyName}</p>
          <p class="label">Location</p><p class="value">${location}</p>
          <p class="label">Approved by</p><p class="value">${reviewed_by || "Admin"}</p>
          ${review_notes ? `<p class="label">Notes</p><p class="value">${review_notes}</p>` : ""}
          <hr class="divider"/>
          <p style="font-size:13px;color:#7a7a7a">The property will appear live on the website after media processing completes.</p>`
        );
        await sendGmailNotification(supabase as any, teamEmail, `[ASAS] Property Approved & Publishing: ${propertyName}`, html, `Property "${propertyName}" has been approved by ${reviewed_by || "admin"} and is being published.`).catch(() => {});
      }

      return new Response(JSON.stringify({ success: true, action: "approved", job_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── REJECT ─────────────────────────────────────────────────────────────────
    if (action === "reject") {
      const errors: string[] = job.validation_errors || [];
      const warnings: string[] = job.validation_warnings || [];

      await supabase.from("import_jobs").update({
        approval_status: "rejected",
        import_status: "reviewing",
        reviewed_by: reviewed_by || "admin",
        reviewed_at: now,
        review_notes: review_notes || null,
      }).eq("id", job_id);

      await supabase.from("import_logs").insert({
        job_id, action: "rejected",
        details: `Rejected by ${reviewed_by || "admin"}. Reason: ${review_notes || "No reason given"}`,
        level: "warning",
      });

      // Notify content team with specific fix instructions
      const { data: emailRow } = await supabase.from("importer_settings").select("value").eq("key", "content_team_email").maybeSingle() as any;
      const teamEmail = emailRow?.value || ((await supabase.from("importer_settings").select("value").eq("key", "admin_email").maybeSingle()) as any).data?.value;

      if (teamEmail) {
        const errorsHtml = errors.length > 0
          ? `<div class="err-box"><strong>Errors to fix:</strong><ul style="margin:8px 0 0;padding-left:20px">${errors.map((e) => `<li style="color:#e53e3e;margin-bottom:4px">${e}</li>`).join("")}</ul></div>`
          : "";
        const warningsHtml = warnings.length > 0
          ? `<div class="warn-box"><strong>Warnings:</strong><ul style="margin:8px 0 0;padding-left:20px">${warnings.map((w) => `<li style="color:#856404;margin-bottom:4px">${w}</li>`).join("")}</ul></div>`
          : "";

        const html = buildEmailHtml(
          `Property Needs Changes: ${propertyName}`,
          `<p>The following property was <strong style="color:#c0392b">rejected</strong> and requires changes before it can be published.</p>
          <p class="label">Property</p><p class="value">${propertyName}</p>
          <p class="label">Location</p><p class="value">${location}</p>
          <p class="label">Reviewed by</p><p class="value">${reviewed_by || "Admin"}</p>
          ${review_notes ? `<p class="label">Admin Notes</p><div class="warn-box">${review_notes}</div>` : ""}
          ${errorsHtml}${warningsHtml}
          <hr class="divider"/>
          <p><strong>To fix:</strong> Update the <code>metadata.json</code> file in the Google Drive folder for this property, then re-import from the ASAS admin dashboard.</p>
          <p style="font-size:13px;color:#7a7a7a">Navigate to: Admin → Auto Import → Queue → find this property → Re-extract</p>`
        );
        await sendGmailNotification(supabase as any, teamEmail, `[ASAS] Property Needs Changes: ${propertyName}`, html, `Property "${propertyName}" was rejected by ${reviewed_by || "admin"}. Reason: ${review_notes || "See dashboard for details."}`).catch(() => {});
      }

      return new Response(JSON.stringify({ success: true, action: "rejected", job_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unhandled action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("approve-property error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
