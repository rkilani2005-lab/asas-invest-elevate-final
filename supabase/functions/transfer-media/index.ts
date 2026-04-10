/**
 * transfer-media — Supabase Edge Function
 *
 * Transfers a file from Google Drive directly to Supabase Storage.
 * The browser NEVER downloads or uploads the file.
 *
 * Flow: Drive → this function → Supabase Storage → return public URL
 *
 * Handles: images (any size), videos (<50 MB), PDFs (brochures)
 * Timeout: must complete within 150s (Supabase edge function limit)
 *
 * Deploy: supabase functions deploy transfer-media
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB hard limit

// ── Token helper ────────────────────────────────────────────────────────────
async function getValidToken(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings")
    .select("key, value")
    .in("key", [
      "gdrive_access_token",
      "gdrive_refresh_token",
      "gdrive_token_expiry",
    ]);
  const map: Record<string, string> = {};
  ((rows || []) as any[]).forEach((r: any) => {
    if (r.value) map[r.key] = r.value;
  });
  if (!map.gdrive_access_token) return null;

  const expiryMs = map.gdrive_token_expiry
    ? new Date(map.gdrive_token_expiry).getTime()
    : 0;
  if (
    Date.now() > expiryMs - 5 * 60 * 1000 &&
    map.gdrive_refresh_token
  ) {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID");
    const GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (GCI && GCS) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GCI,
          client_secret: GCS,
          refresh_token: map.gdrive_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (r.ok) {
        const t = await r.json();
        await (supabase.from("importer_settings") as any).upsert(
          [
            { key: "gdrive_access_token", value: t.access_token },
            {
              key: "gdrive_token_expiry",
              value: new Date(
                Date.now() + (t.expires_in || 3600) * 1000,
              ).toISOString(),
            },
          ],
          { onConflict: "key" },
        );
        return t.access_token;
      }
    }
  }
  return map.gdrive_access_token;
}

// ── MIME type helpers ────────────────────────────────────────────────────────
function inferContentType(filename: string, driveMime?: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    pdf: "application/pdf",
  };
  return map[ext] || driveMime || "application/octet-stream";
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      file_id,
      filename,
      storage_path,
      bucket = "property-media",
      job_id,
      import_media_id,
    } = await req.json();

    if (!file_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: "Missing file_id or storage_path" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = await getValidToken(supabaseAdmin);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "No Google Drive token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 1. Download from Google Drive ─────────────────────────────────────
    console.log(
      `[transfer-media] Downloading "${filename || file_id}" from Drive…`,
    );
    const startMs = Date.now();

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text().catch(() => "unknown");
      return new Response(
        JSON.stringify({
          error: `Drive download failed (HTTP ${driveRes.status})`,
          details: errText.slice(0, 200),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const buffer = await driveRes.arrayBuffer();
    const fileSize = buffer.byteLength;
    const dlMs = Date.now() - startMs;

    console.log(
      `[transfer-media] Downloaded ${(fileSize / 1024 / 1024).toFixed(1)} MB in ${dlMs}ms`,
    );

    // ── 2. Size check ────────────────────────────────────────────────────
    if (fileSize > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `File too large: ${(fileSize / 1024 / 1024).toFixed(1)} MB (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`,
          skipped: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 3. Upload to Supabase Storage ────────────────────────────────────
    const contentType = inferContentType(filename || "file", driveRes.headers.get("content-type") || undefined);
    const uploadStart = Date.now();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storage_path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ ok: false, error: `Storage upload failed: ${uploadError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const uploadMs = Date.now() - uploadStart;

    // ── 4. Get public URL ────────────────────────────────────────────────
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(storage_path);

    console.log(
      `[transfer-media] Uploaded to ${storage_path} (${uploadMs}ms) → ${publicUrl}`,
    );

    // ── 5. Update import_media record if provided ────────────────────────
    if (import_media_id) {
      await supabaseAdmin.from("import_media").update({
        storage_url: publicUrl,
        compressed_size_bytes: fileSize,
        compression_status: "done",
      }).eq("id", import_media_id);
    }

    // ── 6. Log if job_id provided ────────────────────────────────────────
    if (job_id) {
      await supabaseAdmin.from("import_logs").insert({
        job_id,
        action: "media_transferred",
        details: `"${filename}" → Storage (${(fileSize / 1024).toFixed(0)} KB, ${dlMs + uploadMs}ms)`,
        level: "success",
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        url: publicUrl,
        file_size: fileSize,
        content_type: contentType,
        download_ms: dlMs,
        upload_ms: uploadMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[transfer-media]", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
