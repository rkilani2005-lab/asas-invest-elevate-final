/**
 * AI Property Extraction Edge Function (Google Drive version)
 * Downloads PDFs from Google Drive and uses Lovable AI (Gemini) to extract
 * all property fields. Returns structured JSON.
 * Always moves job to "reviewing" status (even on fallback) so the UI unblocks.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACTION_SYSTEM_PROMPT = `You are a professional real estate data extraction specialist for the ASAS property platform in Dubai.
Your task is to analyze property brochure content and extract structured data.
Return ONLY valid JSON with no markdown, no code blocks, no explanations.
Use professional Arabic real estate terminology for all Arabic fields.
Never fabricate data — if information is not available, use empty string "" for text fields or "TBA" for price_range and size_range.`;

const EXTRACTION_USER_PROMPT = (folderName: string, pdfText: string) => `
Analyze this property brochure for "${folderName}" and extract the following data as a single JSON object.

Brochure content:
---
${pdfText.slice(0, 15000)}
---

Return exactly this JSON structure with no extra text:
{
  "name_en": "Property name in English (from brochure, not folder name)",
  "name_ar": "Arabic translation of property name",
  "tagline_en": "Short marketing tagline (1 sentence, under 100 chars)",
  "tagline_ar": "Arabic translation of tagline",
  "developer_en": "Developer company name",
  "developer_ar": "Arabic translation of developer name",
  "location_en": "Property location area and city (e.g., Dubai Marina, Dubai)",
  "location_ar": "Arabic translation of location",
  "price_range": "Price range e.g. AED 1.2M - 3.5M, or TBA",
  "size_range": "Size range e.g. 750 - 2500 sqft, or TBA",
  "unit_types": "Pipe-separated unit types e.g. Studio|1BR|2BR|3BR|4BR",
  "ownership_type": "Freehold or Leasehold",
  "type": "off-plan or ready",
  "handover_date": "YYYY-MM-DD or empty string",
  "overview_en": "Comprehensive 200-300 word property description covering location, design, architecture, amenities, and connectivity",
  "overview_ar": "Arabic translation of overview",
  "highlights_en": "8-12 pipe-separated key highlights covering architecture, views, amenities, connectivity, design",
  "highlights_ar": "Arabic translation of highlights, pipe-separated",
  "investment_en": "2-3 sentence investment appeal paragraph",
  "investment_ar": "Arabic translation of investment text",
  "enduser_text_en": "2-3 sentence lifestyle/end-user appeal paragraph",
  "enduser_text_ar": "Arabic translation of end-user text",
  "ai_confidence": {
    "name_en": "high|medium|low",
    "developer_en": "high|medium|low",
    "location_en": "high|medium|low",
    "price_range": "high|medium|low",
    "type": "high|medium|low",
    "handover_date": "high|medium|low",
    "unit_types": "high|medium|low"
  }
}`;

async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings")
    .select("key, value")
    .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);

  const map: Record<string, string> = {};
  (rows || []).forEach((r: { key: string; value: string | null }) => {
    if (r.value) map[r.key] = r.value;
  });
  if (!map.gdrive_access_token) return null;

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

/** 
 * List direct non-folder files inside a Google Drive folder.
 */
async function listDirectFiles(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; mimeType: string; size?: string }>> {
  const query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size)&pageSize=1000`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

/** List sub-folders in a Google Drive folder. */
async function listSubFolders(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string }>> {
  const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

/**
 * Recursively list ALL files inside a folder and sub-folders (up to 3 levels deep).
 */
async function listDriveFiles(
  accessToken: string,
  folderId: string,
  depth = 0
): Promise<Array<{ id: string; name: string; mimeType: string; size?: string }>> {
  const allFiles: Array<{ id: string; name: string; mimeType: string; size?: string }> = [];

  const directFiles = await listDirectFiles(accessToken, folderId);
  allFiles.push(...directFiles);

  if (depth < 3) {
    const subFolders = await listSubFolders(accessToken, folderId);
    for (const sub of subFolders) {
      const subFiles = await listDriveFiles(accessToken, sub.id, depth + 1);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
}

function makeSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Use service role to avoid JWT validation issues
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { job_id, folder_name } = await req.json();
    if (!job_id || !folder_name) {
      return new Response(JSON.stringify({ error: "Missing job_id or folder_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job to get the drive folder id
    const { data: job } = await supabase
      .from("import_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update job status to extracting
    await supabase.from("import_jobs").update({ import_status: "extracting" }).eq("id", job_id);

    const accessToken = await getValidAccessToken(supabase);

    // ── Populate import_media if empty (for auto-scanned jobs) ──────────────
    const { data: existingMedia } = await supabase
      .from("import_media")
      .select("id")
      .eq("job_id", job_id)
      .limit(1);

    const driveFolderId = job.dropbox_folder_path; // we store drive folder id here

    if ((!existingMedia || existingMedia.length === 0) && accessToken && driveFolderId) {
      const files = await listDriveFiles(accessToken, driveFolderId);

      const pdfFiles  = files.filter((f) =>
        f.mimeType === "application/pdf" ||
        f.mimeType === "application/vnd.google-apps.document" ||
        f.name.toLowerCase().endsWith(".pdf")
      );
      const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
      const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));

      const mediaRows = [
        ...pdfFiles.map((f, i) => ({
          job_id, media_type: "brochure", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id, sort_order: i, is_hero: false,
        })),
        ...imageFiles.map((f, i) => ({
          job_id, media_type: "image", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id, sort_order: i, is_hero: i === 0,
        })),
        ...videoFiles.map((f, i) => ({
          job_id, media_type: "video", original_filename: f.name,
          original_size_bytes: parseInt(f.size || "0", 10) || null,
          dropbox_path: f.id, sort_order: i, is_hero: false,
          compression_status: (parseInt(f.size || "0", 10) || 0) > 40 * 1024 * 1024 ? "skipped" : "pending",
        })),
      ];

      if (mediaRows.length > 0) {
        await supabase.from("import_media").insert(mediaRows);
        // Update counts
        await supabase.from("import_jobs").update({
          pdf_count: pdfFiles.length,
          image_count: imageFiles.length,
          video_count: videoFiles.length,
        }).eq("id", job_id);
      }

      await supabase.from("import_logs").insert({
        job_id, action: "media_populated",
        details: `Populated ${mediaRows.length} media files from Google Drive (${pdfFiles.length} PDFs, ${imageFiles.length} images, ${videoFiles.length} videos)`,
        level: "info",
      });
    }

    // ── Fetch brochure/PDF records ────────────────────────────────────────────
    const { data: pdfMedia } = await supabase
      .from("import_media")
      .select("*")
      .eq("job_id", job_id)
      .eq("media_type", "brochure")
      .order("original_size_bytes", { ascending: false })
      .limit(3);

    const sortedPdfs = pdfMedia || [];

    // ── Try AI extraction with PDF content ───────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase.from("import_jobs").update({ import_status: "error", error_log: "LOVABLE_API_KEY not configured" }).eq("id", job_id);
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extracted: Record<string, unknown> | null = null;

    if (accessToken && sortedPdfs.length > 0) {
      for (const pdf of sortedPdfs) {
        try {
          const fileId = pdf.dropbox_path; // this is actually the drive file ID
          const dlRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!dlRes.ok) continue;

          const buffer = await dlRes.arrayBuffer();
          // Limit PDF size sent to AI (10MB max)
          if (buffer.byteLength > 10 * 1024 * 1024) {
            console.log(`PDF "${pdf.original_filename}" too large (${buffer.byteLength} bytes), skipping`);
            continue;
          }

          const bytes = new Uint8Array(buffer);
          // Build base64 in chunks to avoid call stack overflow on large files
          const CHUNK = 8192;
          let base64 = "";
          for (let i = 0; i < bytes.length; i += CHUNK) {
            base64 += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
          }
          base64 = btoa(base64);

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyze this property brochure PDF for "${folder_name}" and extract the structured data. Return ONLY the JSON object.`,
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:application/pdf;base64,${base64}` },
                    },
                    { type: "text", text: EXTRACTION_USER_PROMPT(folder_name, "") },
                  ],
                },
              ],
              max_tokens: 4096,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            try {
              const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              extracted = JSON.parse(cleaned);

              await supabase.from("import_logs").insert({
                job_id, action: "ai_extraction",
                details: `Successfully extracted data from "${pdf.original_filename}" using Lovable AI (PDF mode)`,
                level: "success",
              });
              break; // Stop after first successful extraction
            } catch {
              console.log(`JSON parse failed for "${pdf.original_filename}", trying next PDF`);
            }
          } else {
            const errText = await aiRes.text();
            console.error(`AI API error for "${pdf.original_filename}": ${aiRes.status} ${errText}`);
            if (aiRes.status === 429 || aiRes.status === 402) break; // Don't retry on rate limit
          }
        } catch (e) {
          console.error(`PDF processing error for job ${job_id}:`, e);
        }
      }
    }

    // ── Fallback: text-only extraction from folder name ──────────────────────
    if (!extracted) {
      const fallbackText = `Property folder: ${folder_name}\n\nNo PDF brochure available. Extract based on the folder name.`;
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            { role: "user", content: EXTRACTION_USER_PROMPT(folder_name, fallbackText) },
          ],
          max_tokens: 4096,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || "{}";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { name_en: folder_name.split(" - ")[0], overview_en: content.slice(0, 500) };
        }

        await supabase.from("import_logs").insert({
          job_id, action: "ai_extraction",
          details: `Extracted data from folder name only (no PDF found) — review recommended`,
          level: "warning",
        });
      } else {
        if (aiRes.status === 429) {
          await supabase.from("import_jobs").update({ import_status: "error", error_log: "Rate limit exceeded" }).eq("id", job_id);
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Even if AI fails, move to reviewing with whatever we have so it's not stuck
        extracted = { name_en: folder_name.split(" - ")[0] };
      }
    }

    // ── Save extracted data and move to reviewing ────────────────────────────
    const nameForSlug = ((extracted?.name_en as string) || folder_name.split(" - ")[0] || folder_name);
    const slug = makeSlug(nameForSlug);
    const finalData = { ...extracted, slug };

    await supabase.from("import_jobs").update({
      ...finalData,
      ai_extraction_raw: extracted,
      import_status: "reviewing", // Always set to reviewing so UI unblocks
    }).eq("id", job_id);

    return new Response(JSON.stringify({ success: true, data: finalData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-property error:", e);
    // Even on error, try to move job to reviewing so it's not stuck
    try {
      const { job_id } = await req.clone().json().catch(() => ({ job_id: null }));
      if (job_id) {
        const supabase2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase2.from("import_jobs").update({
          import_status: "error",
          error_log: String(e),
        }).eq("id", job_id);
      }
    } catch { /* best effort */ }

    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
