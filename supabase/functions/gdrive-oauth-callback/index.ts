/**
 * Google Drive OAuth callback edge function
 * Exchanges the authorization code for tokens and stores in importer_settings.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminOrigin = Deno.env.get("ADMIN_ORIGIN") || "https://asas.ae";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(
      `${adminOrigin}/admin/importer/settings?gdrive_error=${error || "missing_code"}`,
      302
    );
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gdrive-oauth-callback`;

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
    return Response.redirect(
      `${adminOrigin}/admin/importer/settings?gdrive_error=token_exchange_failed`,
      302
    );
  }

  const tokens = await tokenResp.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Get user email from Google
  const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await profileResp.json();
  const email = profile.email || "unknown";

  const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  // Upsert tokens into importer_settings
  await supabase.from("importer_settings").upsert([
    { key: "gdrive_access_token", value: access_token },
    { key: "gdrive_refresh_token", value: refresh_token || "" },
    { key: "gdrive_token_expiry", value: tokenExpiry },
    { key: "gdrive_connected_email", value: email },
    { key: "gdrive_connected", value: "true" },
  ], { onConflict: "key" });

  return Response.redirect(
    `${adminOrigin}/admin/importer/settings?gdrive_connected=true&email=${encodeURIComponent(email)}`,
    302
  );
});
