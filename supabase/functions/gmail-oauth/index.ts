import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (!claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") || Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") || Deno.env.get("GOOGLE_CLIENT_SECRET");
  const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-oauth-callback`;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (await req.json().catch(() => ({}))).action;

  // ---- GET AUTH URL ----
  if (action === "get_auth_url") {
    const body = await req.json().catch(() => ({}));
    const purpose = body.purpose || "info";

    if (!GOOGLE_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_CLIENT_ID not configured. Please add it in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const state = btoa(JSON.stringify({ purpose, userId: claimsData.claims.sub }));
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email"
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- TEST CONNECTION ----
  if (action === "test") {
    const body = await req.json().catch(() => ({}));
    const { accountId } = body;

    const { data: account } = await supabase
      .from("gmail_accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    if (!account?.access_token) {
      return new Response(JSON.stringify({ success: false, error: "No token found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${account.access_token}` } }
    );

    if (resp.ok) {
      const profile = await resp.json();
      await supabase
        .from("gmail_accounts")
        .update({ last_tested_at: new Date().toISOString(), is_connected: true })
        .eq("id", accountId);
      return new Response(JSON.stringify({ success: true, email: profile.emailAddress }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Token invalid or expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ---- DISCONNECT ----
  if (action === "disconnect") {
    const body = await req.json().catch(() => ({}));
    const { accountId } = body;
    await supabase
      .from("gmail_accounts")
      .update({ access_token: null, refresh_token: null, is_connected: false })
      .eq("id", accountId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
