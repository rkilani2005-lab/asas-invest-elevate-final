/**
 * Google Drive Auto-Scan Edge Function
 * Lists property folders in the configured root folder, compares against existing
 * import_jobs, and queues new/updated folders for processing.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings")
    .select("key, value")
    .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);

  const map: Record<string, string> = {};
  (rows || []).forEach((r) => { if (r.value) map[r.key] = r.value; });

  if (!map.gdrive_access_token) return null;

  // Check expiry — if we have a refresh token, pro-actively refresh 5 min before expiry
  const expiryMs = map.gdrive_token_expiry ? new Date(map.gdrive_token_expiry).getTime() : 0;
  const needsRefresh = Date.now() > expiryMs - 5 * 60 * 1000;

  if (needsRefresh && map.gdrive_refresh_token) {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return map.gdrive_access_token;

    const refreshResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: map.gdrive_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (refreshResp.ok) {
      const tokens = await refreshResp.json();
      const newExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await supabase.from("importer_settings").upsert([
        { key: "gdrive_access_token", value: tokens.access_token },
        { key: "gdrive_token_expiry", value: newExpiry },
      ], { onConflict: "key" });
      return tokens.access_token;
    }
  }

  return map.gdrive_access_token;
}

async function listFoldersInDrive(accessToken: string, folderId: string): Promise<Array<{
  id: string; name: string; modifiedTime: string;
}>> {
  const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&pageSize=1000&orderBy=name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Drive API error listing folders: ${err}`);
  }
  const data = await resp.json();
  return data.files || [];
}

async function listFilesInFolder(accessToken: string, folderId: string): Promise<Array<{
  id: string; name: string; mimeType: string; size?: string;
}>> {
  const query = `'${folderId}' in parents and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&pageSize=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get settings
    const { data: settingsRows } = await supabase
      .from("importer_settings")
      .select("key, value")
      .in("key", ["gdrive_root_folder_id", "gdrive_connected"]);

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r) => { if (r.value) settings[r.key] = r.value; });

    if (settings.gdrive_connected !== "true") {
      return new Response(JSON.stringify({ error: "Google Drive not connected", action: "skipped" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rootFolderId = settings.gdrive_root_folder_id;
    if (!rootFolderId) {
      return new Response(JSON.stringify({ error: "No root folder configured", action: "skipped" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidAccessToken(supabase);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Could not obtain valid access token", action: "skipped" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all subfolders in root
    const driveFolders = await listFoldersInDrive(accessToken, rootFolderId);

    // Get existing import jobs by dropbox_folder_path (we repurpose this as drive folder_id)
    const { data: existingJobs } = await supabase
      .from("import_jobs")
      .select("dropbox_folder_path, updated_at, import_status");

    const existingMap = new Map<string, { updated_at: string; import_status: string }>();
    (existingJobs || []).forEach((j) => {
      existingMap.set(j.dropbox_folder_path, { updated_at: j.updated_at || "", import_status: j.import_status || "" });
    });

    let newJobs = 0;
    const skipped: string[] = [];

    for (const folder of driveFolders) {
      const existing = existingMap.get(folder.id);

      // Skip if already exists and hasn't been modified + not in an error state
      if (existing && existing.import_status !== "error") {
        const existingUpdated = new Date(existing.updated_at).getTime();
        const driveModified = new Date(folder.modifiedTime).getTime();
        if (driveModified <= existingUpdated) {
          skipped.push(folder.name);
          continue;
        }
      }

      // List files in this folder
      const files = await listFilesInFolder(accessToken, folder.id);
      const pdfFiles = files.filter((f) =>
        f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf") ||
        f.mimeType === "application/vnd.google-apps.document"
      );
      const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
      const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));

      const totalSizeBytes = files.reduce((acc, f) => acc + parseInt(f.size || "0", 10), 0);

      // Insert or update job
      if (existing) {
        await supabase
          .from("import_jobs")
          .update({
            import_status: "pending",
            pdf_count: pdfFiles.length,
            image_count: imageFiles.length,
            video_count: videoFiles.length,
            total_size_bytes: totalSizeBytes,
            updated_at: new Date().toISOString(),
          })
          .eq("dropbox_folder_path", folder.id);
      } else {
        await supabase.from("import_jobs").insert({
          dropbox_folder_path: folder.id, // store drive folder_id here
          folder_name: folder.name,
          import_status: "pending",
          pdf_count: pdfFiles.length,
          image_count: imageFiles.length,
          video_count: videoFiles.length,
          total_size_bytes: totalSizeBytes,
        });
      }

      await supabase.from("import_logs").insert({
        action: "gdrive_queued",
        details: `Queued folder "${folder.name}" from Google Drive (${pdfFiles.length} docs, ${imageFiles.length} images)`,
        level: "info",
      });

      newJobs++;
    }

    // Update last scan time
    await supabase.from("importer_settings").upsert(
      { key: "gdrive_last_scan", value: new Date().toISOString() },
      { onConflict: "key" }
    );

    return new Response(JSON.stringify({
      success: true,
      action: "scanned",
      total: driveFolders.length,
      new_jobs: newJobs,
      skipped: skipped.length,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gdrive-scan error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
