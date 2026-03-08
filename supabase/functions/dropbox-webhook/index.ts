/**
 * Dropbox Webhook Edge Function
 *
 * Dropbox webhook flow:
 *   1. GET  ?challenge=xxx  →  echo challenge back (ownership verification)
 *   2. POST {list_folder:{accounts:[...]}}  →  detect changed folders → queue import_jobs
 *
 * Uses a cursor stored in importer_settings (key = "dropbox_cursor") to call
 * /files/list_folder/continue so we only process deltas since the last scan.
 * If no cursor exists yet we grab the latest cursor and save it (no jobs queued
 * on the very first call — acts as baseline).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Service-role client — webhook is called by Dropbox, not by an authenticated user
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

/** Walk list_folder/continue pages until has_more = false. Returns all file/folder entries. */
async function drainCursor(token: string, cursor: string) {
  const entries: Record<string, unknown>[] = [];
  let current = cursor;
  let hasMore = true;

  while (hasMore) {
    const page = await dropboxPost(token, "files/list_folder/continue", { cursor: current });
    entries.push(...(page.entries ?? []));
    hasMore = page.has_more;
    current = page.cursor;
  }

  return { entries, newCursor: current };
}

/** Detect property folders from a list of Dropbox entries filtered to root path */
function extractPropertyFolders(entries: Record<string, unknown>[], rootPath: string) {
  const seen = new Set<string>();
  const folders: { path: string; name: string }[] = [];

  for (const entry of entries) {
    const path = (entry["path_lower"] as string) ?? "";
    const tag = entry[".tag"] as string;

    // We want any entry whose parent is the root path.
    // A new folder: tag === "folder" and its parent === rootPath
    // A new file inside a property folder: parent's parent === rootPath
    const parts = path.split("/").filter(Boolean);
    const rootParts = rootPath.replace(/^\//, "").split("/").filter(Boolean);

    // The property folder is at depth rootParts.length + 1
    if (parts.length >= rootParts.length + 1) {
      // Check the root prefix matches
      const prefix = parts.slice(0, rootParts.length).join("/");
      if (prefix.toLowerCase() === rootParts.join("/").toLowerCase()) {
        const folderName = parts[rootParts.length];
        const folderPath = "/" + [...rootParts, folderName].join("/");
        if (!seen.has(folderPath.toLowerCase())) {
          seen.add(folderPath.toLowerCase());
          // Only add if entry is a folder OR a file inside a subfolder
          if (tag === "folder" || parts.length > rootParts.length + 1) {
            folders.push({ path: folderPath, name: folderName });
          }
        }
      }
    }
  }

  return folders;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── GET — Dropbox ownership challenge ─────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");
    if (challenge) {
      return new Response(challenge, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // ── POST — Dropbox change notification ────────────────────────────────────
  if (req.method === "POST") {
    try {
      const supabase = getAdminClient();

      const dropboxToken = await getSetting(supabase, "dropbox_access_token");
      if (!dropboxToken) {
        console.error("dropbox-webhook: no token stored, ignoring notification");
        return new Response(JSON.stringify({ ok: false, error: "no token" }), {
          status: 200, // Must return 200 to Dropbox even on soft errors
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rootPath = (await getSetting(supabase, "dropbox_root_path")) || "/ASAS-Properties";
      let cursor = await getSetting(supabase, "dropbox_cursor");

      // ── No cursor yet: establish baseline cursor, don't queue anything ──
      if (!cursor) {
        const data = await dropboxPost(dropboxToken, "files/list_folder/get_latest_cursor", {
          path: rootPath,
          recursive: true,
        });
        await saveSetting(supabase, "dropbox_cursor", data.cursor);
        console.log("dropbox-webhook: baseline cursor saved, no jobs queued");
        return new Response(JSON.stringify({ ok: true, action: "baseline_saved" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Drain delta since last cursor ────────────────────────────────────
      const { entries, newCursor } = await drainCursor(dropboxToken, cursor);

      // Persist new cursor immediately so we don't re-process on crash
      await saveSetting(supabase, "dropbox_cursor", newCursor);

      if (entries.length === 0) {
        return new Response(JSON.stringify({ ok: true, action: "no_changes" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Detect which property folders are affected ───────────────────────
      const folders = extractPropertyFolders(entries, rootPath);
      if (folders.length === 0) {
        return new Response(JSON.stringify({ ok: true, action: "no_new_folders", entries: entries.length }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Check which folders are already in import_jobs ───────────────────
      const paths = folders.map((f) => f.path);
      const { data: existing } = await supabase
        .from("import_jobs")
        .select("dropbox_folder_path")
        .in("dropbox_folder_path", paths);

      const existingPaths = new Set((existing ?? []).map((r) => r.dropbox_folder_path));
      const newFolders = folders.filter((f) => !existingPaths.has(f.path));

      if (newFolders.length === 0) {
        return new Response(JSON.stringify({ ok: true, action: "folders_already_queued", count: folders.length }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Scan each new folder for file counts ────────────────────────────
      const jobs = await Promise.all(
        newFolders.map(async (folder) => {
          const subfolders = ["brochures", "images", "videos"];
          let pdfCount = 0;
          let imageCount = 0;
          let videoCount = 0;
          let totalBytes = 0;

          await Promise.all(
            subfolders.map(async (sub) => {
              try {
                const res = await dropboxPost(dropboxToken, "files/list_folder", {
                  path: `${folder.path}/${sub}`,
                  recursive: false,
                });
                for (const entry of res.entries ?? []) {
                  if (entry[".tag"] !== "file") continue;
                  const size = (entry as Record<string, unknown>)["size"] as number ?? 0;
                  totalBytes += size;
                  const name = ((entry as Record<string, unknown>)["name"] as string ?? "").toLowerCase();
                  if (sub === "brochures" && name.endsWith(".pdf")) pdfCount++;
                  if (sub === "images" && /\.(jpg|jpeg|png|webp)$/.test(name)) imageCount++;
                  if (sub === "videos" && /\.(mp4|mov|avi|webm)$/.test(name)) videoCount++;
                }
              } catch {
                // subfolder may not exist — fine
              }
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

      const { error: insertError } = await supabase.from("import_jobs").insert(jobs);
      if (insertError) {
        console.error("dropbox-webhook: insert error", insertError);
      }

      // ── Log the event ────────────────────────────────────────────────────
      await supabase.from("import_logs").insert(
        jobs.map((j) => ({
          action: "webhook_queued",
          details: `Auto-queued via Dropbox webhook: ${j.folder_name}`,
          level: "info",
          job_id: null,
        }))
      );

      console.log(`dropbox-webhook: queued ${jobs.length} new job(s)`);
      return new Response(
        JSON.stringify({ ok: true, action: "jobs_queued", count: jobs.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("dropbox-webhook error:", err);
      // Still return 200 so Dropbox doesn't retry aggressively
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
