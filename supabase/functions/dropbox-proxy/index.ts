/**
 * Dropbox Proxy Edge Function
 * Handles all Dropbox API calls server-side so the token never leaks to the client.
 * Actions:
 *   list_root       - list all property folders in root path
 *   scan_property   - scan brochures/, images/, videos/ subfolders for a property folder
 *   download_file   - download a file from Dropbox and return as base64
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getDropboxToken(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("importer_settings")
    .select("value")
    .eq("key", "dropbox_access_token")
    .maybeSingle();
  return data?.value ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;
    const dropboxToken = await getDropboxToken(supabase);

    if (!dropboxToken && action !== "save_token") {
      return new Response(JSON.stringify({ error: "Dropbox not connected. Please add your access token in Settings." }), {
        status: 400, headers: corsHeaders,
      });
    }

    // ─── Save token ───────────────────────────────────────────────────────────
    if (action === "save_token") {
      const { token: newToken } = body;
      await supabase.from("importer_settings").upsert({ key: "dropbox_access_token", value: newToken });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ─── List root property folders ───────────────────────────────────────────
    if (action === "list_root") {
      const rootPath = body.root_path || "/ASAS-Properties";
      let allFolders: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const endpoint = cursor
          ? "https://api.dropboxapi.com/2/files/list_folder/continue"
          : "https://api.dropboxapi.com/2/files/list_folder";
        const payload = cursor ? { cursor } : { path: rootPath, recursive: false };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${dropboxToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.text();
          // If folder doesn't exist, return empty
          if (err.includes("not_found") || err.includes("path/not_found")) {
            return new Response(JSON.stringify({ folders: [], error: `Folder "${rootPath}" not found in Dropbox` }), {
              headers: corsHeaders,
            });
          }
          return new Response(JSON.stringify({ error: `Dropbox error: ${err}` }), { status: 400, headers: corsHeaders });
        }

        const data = await res.json();
        allFolders = [...allFolders, ...data.entries.filter((e: any) => e[".tag"] === "folder")];
        hasMore = data.has_more;
        cursor = data.cursor;
      }

      return new Response(JSON.stringify({ folders: allFolders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Scan a property folder for brochures/images/videos ───────────────────
    if (action === "scan_property") {
      const { folder_path } = body;
      const subfolders = ["brochures", "images", "videos"];
      const result: Record<string, any[]> = { brochures: [], images: [], videos: [] };

      await Promise.all(subfolders.map(async (sub) => {
        const subPath = `${folder_path}/${sub}`;
        try {
          const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
            method: "POST",
            headers: { Authorization: `Bearer ${dropboxToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ path: subPath }),
          });
          if (res.ok) {
            const d = await res.json();
            result[sub] = (d.entries || []).filter((e: any) => e[".tag"] === "file");
          }
        } catch {
          // subfolder missing — ok
        }
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Download a file and return as base64 ─────────────────────────────────
    if (action === "download_file") {
      const { file_path } = body;
      const res = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: file_path }),
        },
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Failed to download: ${file_path}` }), { status: 400, headers: corsHeaders });
      }

      const buffer = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const contentType = res.headers.get("Content-Type") || "application/octet-stream";

      return new Response(JSON.stringify({ base64, contentType, size: buffer.byteLength }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get a temporary link for preview ─────────────────────────────────────
    if (action === "get_preview_link") {
      const { file_path } = body;
      const res = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
        method: "POST",
        headers: { Authorization: `Bearer ${dropboxToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path: file_path }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to get preview link" }), { status: 400, headers: corsHeaders });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ link: data.link }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("dropbox-proxy error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
