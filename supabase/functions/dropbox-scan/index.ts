import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
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

    const { action, dropbox_token, folder_path = "/ASAS-Properties", cursor } = await req.json();

    if (action === "list_folders") {
      // List all property folders in the root directory
      const endpoint = cursor
        ? "https://api.dropboxapi.com/2/files/list_folder/continue"
        : "https://api.dropboxapi.com/2/files/list_folder";

      const body = cursor ? { cursor } : { path: folder_path, recursive: false };

      const dropboxRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropbox_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!dropboxRes.ok) {
        const err = await dropboxRes.text();
        return new Response(JSON.stringify({ error: `Dropbox API error: ${err}` }), { status: 400, headers: corsHeaders });
      }

      const data = await dropboxRes.json();
      const folders = data.entries.filter((e: any) => e[".tag"] === "folder");

      return new Response(JSON.stringify({
        folders,
        has_more: data.has_more,
        cursor: data.cursor,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "scan_property_folder") {
      const { property_folder_path } = await req.json().catch(() => ({})) as any;
      const { property_folder_path: pfp } = await req.json().catch(() => ({})) as any;
      // Already destructured above — re-parse from req body handled differently
      // Re-read from already-parsed body
      const body2 = await req.text().then(() => ({})).catch(() => ({})) as any;

      // We'll scan subfolders: brochures/, images/, videos/
      const subfolders = ["brochures", "images", "videos"];
      const result: Record<string, any[]> = {};

      for (const sub of subfolders) {
        const subPath = `${folder_path}/${sub}`;
        try {
          const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${dropbox_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: subPath }),
          });
          if (res.ok) {
            const d = await res.json();
            result[sub] = d.entries || [];
          } else {
            result[sub] = [];
          }
        } catch {
          result[sub] = [];
        }
      }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "scan_subfolder") {
      const { subfolder_path } = await req.json().catch(() => ({})) as any;
      // Parse differently since we already consumed body above in list_folders path
      return new Response(JSON.stringify({ error: "Use scan_full_property instead" }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("dropbox-scan error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
