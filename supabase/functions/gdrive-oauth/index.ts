/**
 * Google Drive OAuth edge function
 * Handles: get_auth_url, test, disconnect, refresh_token
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await anonClient.auth.getClaims(token);
  if (!claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gdrive-oauth-callback`;

  const url = new URL(req.url);
  const actionFromQuery = url.searchParams.get("action");
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }
  const action = actionFromQuery || (body.action as string);

  // ---- GET AUTH URL ----
  if (action === "get_auth_url") {
    if (!GOOGLE_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_CLIENT_ID not configured. Add it in Settings → Secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const state = btoa(JSON.stringify({ userId: claimsData.claims.sub }));
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email"
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);
    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- TEST ----
  if (action === "test") {
    const { data: settings } = await supabase
      .from("importer_settings")
      .select("key, value")
      .in("key", ["gdrive_access_token", "gdrive_connected_email"]);

    const map: Record<string, string> = {};
    (settings || []).forEach((r) => { if (r.value) map[r.key] = r.value; });

    if (!map.gdrive_access_token) {
      return new Response(JSON.stringify({ success: false, error: "Not connected" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${map.gdrive_access_token}` },
    });

    if (resp.ok) {
      const data = await resp.json();
      await supabase.from("importer_settings").upsert(
        { key: "gdrive_last_tested", value: new Date().toISOString() },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ success: true, email: data.user?.emailAddress }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try refresh
    const { data: refreshRow } = await supabase
      .from("importer_settings")
      .select("value")
      .eq("key", "gdrive_refresh_token")
      .maybeSingle();

    if (refreshRow?.value && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshRow.value,
          grant_type: "refresh_token",
        }),
      });
      if (refreshResp.ok) {
        const tokens = await refreshResp.json();
        await supabase.from("importer_settings").upsert(
          { key: "gdrive_access_token", value: tokens.access_token },
          { onConflict: "key" }
        );
        return new Response(JSON.stringify({ success: true, refreshed: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Token expired or revoked" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- DISCONNECT ----
  if (action === "disconnect") {
    await supabase.from("importer_settings").upsert([
      { key: "gdrive_access_token", value: null },
      { key: "gdrive_refresh_token", value: null },
      { key: "gdrive_connected_email", value: null },
      { key: "gdrive_connected", value: "false" },
    ], { onConflict: "key" });
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- LIST ROOT FOLDER ----
  if (action === "list_root") {
    const folderId = body.folder_id as string;
    const { data: tokenRow } = await supabase
      .from("importer_settings")
      .select("value")
      .eq("key", "gdrive_access_token")
      .maybeSingle();

    const accessToken = tokenRow?.value;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not connected to Google Drive" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = folderId
      ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const driveResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,parents)&pageSize=200&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!driveResp.ok) {
      const err = await driveResp.text();
      return new Response(JSON.stringify({ error: `Drive API error: ${err}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveData = await driveResp.json();
    return new Response(JSON.stringify({ folders: driveData.files || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- LIST FILES IN FOLDER ----
  if (action === "list_files") {
    const folderId = body.folder_id as string;
    const { data: tokenRow } = await supabase
      .from("importer_settings")
      .select("value")
      .eq("key", "gdrive_access_token")
      .maybeSingle();

    const accessToken = tokenRow?.value;
    if (!accessToken || !folderId) {
      return new Response(JSON.stringify({ error: "Missing folder_id or not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `'${folderId}' in parents and trashed=false`;
    const driveResp = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime)&pageSize=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const driveData = await driveResp.json();
    return new Response(JSON.stringify({ files: driveData.files || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- GET DOWNLOAD LINK (for media pipeline) ----
  if (action === "get_download_link") {
    const fileId = (body.file_id as string);
    if (!fileId) {
      return new Response(JSON.stringify({ error: "Missing file_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch access token + expiry + refresh token
    const { data: tokenRows } = await supabase
      .from("importer_settings")
      .select("key, value")
      .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);

    const tokenMap: Record<string, string> = {};
    ((tokenRows || []) as any[]).forEach((r: any) => { if (r.value) tokenMap[r.key] = r.value; });

    let accessToken = tokenMap.gdrive_access_token;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not connected to Google Drive" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh if expired or within 5 minutes of expiry
    const expiryMs = tokenMap.gdrive_token_expiry ? new Date(tokenMap.gdrive_token_expiry).getTime() : 0;
    const needsRefresh = Date.now() > expiryMs - 5 * 60 * 1000;

    if (needsRefresh && tokenMap.gdrive_refresh_token && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenMap.gdrive_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (refreshResp.ok) {
        const tokens = await refreshResp.json();
        accessToken = tokens.access_token;
        const newExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
        await supabase.from("importer_settings").upsert([
          { key: "gdrive_access_token", value: accessToken },
          { key: "gdrive_token_expiry", value: newExpiry },
        ], { onConflict: "key" });
      }
    }

    return new Response(JSON.stringify({ access_token: accessToken, file_id: fileId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
