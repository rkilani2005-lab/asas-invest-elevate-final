import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const adminOrigin = Deno.env.get("ADMIN_ORIGIN") || "https://asas.ae";

  if (error || !code || !stateRaw) {
    return Response.redirect(`${adminOrigin}/admin/communications/settings?gmail_error=${error || "missing_code"}`, 302);
  }

  let purpose = "info";
  try {
    const state = JSON.parse(atob(stateRaw));
    purpose = state.purpose || "info";
  } catch (_) {/* ignore */}

  const GOOGLE_CLIENT_ID = (Deno.env.get("GMAIL_CLIENT_ID") || Deno.env.get("GOOGLE_CLIENT_ID"))!;
  const GOOGLE_CLIENT_SECRET = (Deno.env.get("GMAIL_CLIENT_SECRET") || Deno.env.get("GOOGLE_CLIENT_SECRET"))!;
  const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-oauth-callback`;

  // Exchange code for tokens
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    console.error("Token exchange error:", err);
    return Response.redirect(`${adminOrigin}/admin/communications/settings?gmail_error=token_exchange_failed`, 302);
  }

  const tokens = await tokenResp.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Get email address from Google
  const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await profileResp.json();
  const email = profile.email;

  if (!email) {
    return Response.redirect(`${adminOrigin}/admin/communications/settings?gmail_error=no_email`, 302);
  }

  const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  // Upsert gmail account
  await supabase.from("gmail_accounts").upsert(
    {
      email,
      purpose,
      display_name: profile.name || email,
      access_token,
      refresh_token,
      token_expiry: tokenExpiry,
      is_connected: true,
    },
    { onConflict: "email" }
  );

  return Response.redirect(`${adminOrigin}/admin/communications/settings?gmail_connected=true&email=${encodeURIComponent(email)}`, 302);
});
