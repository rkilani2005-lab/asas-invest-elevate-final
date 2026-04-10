/**
 * Dropbox Auto-Scan Edge Function
 *
 * Called by pg_cron every hour. Checks the `auto_scan_interval` setting
 * and decides whether to actually run a scan:
 *   - "disabled"  → exit immediately
 *   - "hourly"    → scan every call
 *   - "daily"     → scan only if ≥ 24 h have passed since last run
 *
 * On scan: lists all property folders in the root path, queues any that
 * are not already in import_jobs, and records a log entry.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getSetting(supabase: ReturnType<typeof getAdminClient>, key: string): Promise<string | null> {
  const { data } = await supabase
    .from("importer_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function saveSetting(supabase: ReturnType<typeof getAdminClient>, key: string, value: string) {
  await supabase
    .from("importer_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

async function dropboxPost(token: string, endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dropbox ${endpoint}: ${text}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getAdminClient();
    const now = new Date();

    // ── Check interval setting ────────────────────────────────────────────────
    const interval = (await getSetting(supabase, "auto_scan_interval")) ?? "disabled";

    if (interval === "disabled") {
      return new Response(JSON.stringify({ ok: true, action: "skipped", reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (interval === "daily") {
      const lastRun = await getSetting(supabase, "auto_scan_last_run");
      if (lastRun) {
        const elapsed = now.getTime() - new Date(lastRun).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (elapsed < twentyFourHours) {
          const nextRun = new Date(new Date(lastRun).getTime() + twentyFourHours);
          return new Response(
            JSON.stringify({ ok: true, action: "skipped", reason: "not_due_yet", next_run: nextRun.toISOString() }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ── Read connection settings ──────────────────────────────────────────────
    const dropboxToken = await getSetting(supabase, "dropbox_access_token");
    if (!dropboxToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "No Dropbox token configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const rootPath = (await getSetting(supabase, "dropbox_root_path")) || "/ASAS-Properties";

    // ── Scan Dropbox root folder ──────────────────────────────────────────────
    let allFolders: { path: string; name: string }[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const endpoint = cursor ? "files/list_folder/continue" : "files/list_folder";
      const payload = cursor ? { cursor } : { path: rootPath, recursive: false };

      const data = await dropboxPost(dropboxToken, endpoint, payload);
      const folders = (data.entries ?? [])
        .filter((e: Record<string, unknown>) => e[".tag"] === "folder")
        .map((e: Record<string, unknown>) => ({
          path: e.path_lower as string,
          name: e.name as string,
        }));
      allFolders = [...allFolders, ...folders];
      hasMore = data.has_more;
      cursor = data.cursor;
    }

    if (allFolders.length === 0) {
      await saveSetting(supabase, "auto_scan_last_run", now.toISOString());
      await supabase.from("import_logs").insert({
        action: "auto_scan",
        details: `Auto-scan (${interval}): root folder empty or not found`,
        level: "info",
      });
      return new Response(
        JSON.stringify({ ok: true, action: "scanned", new_jobs: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Find folders not yet in import_jobs ───────────────────────────────────
    const paths = allFolders.map((f) => f.path);
    const { data: existing } = await supabase
      .from("import_jobs")
      .select("dropbox_folder_path")
      .in("dropbox_folder_path", paths);

    const existingPaths = new Set((existing ?? []).map((r) => r.dropbox_folder_path));
    const newFolders = allFolders.filter((f) => !existingPaths.has(f.path));

    // ── Queue new folders ─────────────────────────────────────────────────────
    let queuedCount = 0;
    if (newFolders.length > 0) {
      const jobs = await Promise.all(
        newFolders.map(async (folder) => {
          let pdfCount = 0, imageCount = 0, videoCount = 0, totalBytes = 0;
          await Promise.all(
            ["brochures", "images", "videos"].map(async (sub) => {
              try {
                const res = await dropboxPost(dropboxToken, "files/list_folder", {
                  path: `${folder.path}/${sub}`,
                  recursive: false,
                });
                for (const entry of res.entries ?? []) {
                  if (entry[".tag"] !== "file") continue;
                  totalBytes += (entry.size as number) ?? 0;
                  const name = ((entry.name as string) ?? "").toLowerCase();
                  if (sub === "brochures" && name.endsWith(".pdf")) pdfCount++;
                  if (sub === "images" && /\.(jpg|jpeg|png|webp)$/.test(name)) imageCount++;
                  if (sub === "videos" && /\.(mp4|mov|avi|webm)$/.test(name)) videoCount++;
                }
              } catch { /* subfolder missing — ok */ }
            })
          );
          return {
            dropbox_folder_path: folder.path,
            folder_name: folder.name,
            import_status: "pending",
            pdf_count: pdfCount,
            image_count: imageCount,
            video_count: videoCount,
            total_size_bytes: totalBytes,
          };
        })
      );

      const { error } = await supabase.from("import_jobs").insert(jobs);
      if (!error) {
        queuedCount = jobs.length;
        await supabase.from("import_logs").insert(
          jobs.map((j) => ({
            action: "auto_scan",
            details: `Auto-scan (${interval}): queued "${j.folder_name}"`,
            level: "info",
          }))
        );
      }
    }

    // ── Update last-run timestamp and log summary ─────────────────────────────
    await saveSetting(supabase, "auto_scan_last_run", now.toISOString());
    await supabase.from("import_logs").insert({
      action: "auto_scan",
      details: `Auto-scan (${interval}): found ${allFolders.length} folder(s), queued ${queuedCount} new job(s)`,
      level: queuedCount > 0 ? "info" : "info",
    });

    console.log(`dropbox-auto-scan: scanned ${allFolders.length} folders, queued ${queuedCount}`);
    return new Response(
      JSON.stringify({ ok: true, action: "scanned", total: allFolders.length, new_jobs: queuedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("dropbox-auto-scan error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
