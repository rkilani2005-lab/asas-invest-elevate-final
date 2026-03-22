import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      form_type,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message,
      preferred_language = "en",
      preferred_contact = "email",
      property_id,
      property_name,
      unit_type_interest,
      budget_range,
      purpose,
      viewing_date,
      viewing_time,
      viewing_alt_date,
      attendees = 1,
      callback_time,
      newsletter_interests,
      subject,
      consent_given = false,
      source_page,
      utm_source,
      utm_medium,
      utm_campaign,
    } = body;

    // Basic validation
    if (!form_type || !visitor_email) {
      return new Response(
        JSON.stringify({ success: false, error: "form_type and visitor_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitor_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication: same email + same form_type within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: dupe } = await supabase
      .from("form_submissions")
      .select("id")
      .eq("visitor_email", visitor_email)
      .eq("form_type", form_type)
      .gte("created_at", fiveMinutesAgo)
      .maybeSingle();

    if (dupe) {
      return new Response(
        JSON.stringify({ success: true, submission_id: dupe.id, message: "Duplicate submission detected." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from("form_submissions")
      .insert({
        form_type,
        visitor_name,
        visitor_email,
        visitor_phone,
        visitor_message,
        preferred_language,
        preferred_contact,
        property_id: property_id || null,
        property_name,
        unit_type_interest,
        budget_range,
        purpose,
        viewing_date: viewing_date || null,
        viewing_time,
        viewing_alt_date: viewing_alt_date || null,
        attendees,
        callback_time,
        newsletter_interests,
        subject,
        consent_given,
        source_page,
        utm_source,
        utm_medium,
        utm_campaign,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle newsletter subscription separately
    if (form_type === "newsletter" && visitor_email) {
      await supabase.from("newsletter_subscribers").upsert(
        {
          email: visitor_email,
          name: visitor_name,
          interests: newsletter_interests ? newsletter_interests.split("|") : [],
          preferred_language,
          is_active: true,
        },
        { onConflict: "email" }
      );
    }

    // Get team notification email from settings
    const { data: settingRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "notification_email")
      .maybeSingle();
    const teamEmail: string = (settingRow?.value as string) || "admin@asasinvest.com";

    // Get Gmail account for sender — try purpose-specific first, then any connected account
    const senderPurpose = ["contact", "newsletter"].includes(form_type) ? "info" : "sales";
    let { data: gmailAccount } = await supabase
      .from("gmail_accounts")
      .select("*")
      .eq("purpose", senderPurpose)
      .eq("is_connected", true)
      .maybeSingle();

    // Fallback: use any connected Gmail account
    if (!gmailAccount) {
      const { data: anyAccount } = await supabase
        .from("gmail_accounts")
        .select("*")
        .eq("is_connected", true)
        .limit(1)
        .maybeSingle();
      gmailAccount = anyAccount;
    }

    // Trigger send-email edge function (fire and forget)
    const sendEmailUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
    const emailPayload = {
      submission_id: submission.id,
      form_type,
      visitor_name,
      visitor_email,
      visitor_phone,
      visitor_message,
      preferred_language,
      property_name,
      property_id,
      viewing_date,
      viewing_time,
      callback_time,
      budget_range,
      unit_type_interest,
      purpose,
      team_email: teamEmail,
      gmail_account: gmailAccount,
    };

    // Fire and forget — don't await so the form response is fast
    fetch(sendEmailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify(emailPayload),
    }).catch((e) => console.error("Email send trigger error:", e));

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission.id,
        message: "Submission received. Confirmation email will be sent shortly.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
