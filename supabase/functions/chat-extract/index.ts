/**
 * chat-extract — Supabase Edge Function  (V4 — Claude API Edition)
 *
 * Admin "AI Property Chat" extractor, now powered by the Anthropic Claude API
 * (claude-opus-4-8) instead of the Lovable Gemini gateway. Claude reads PDFs
 * natively (text AND embedded images) via base64 `document` blocks, and produces
 * the bilingual EN/AR property record in one pass.
 *
 *   • PDFs            → base64 `document` blocks (Claude reads them directly — no
 *                       server-side regex, so no more 546 resource crashes).
 *   • Images          → base64 `image` blocks (vision) + registered as media.
 *   • DOCX            → unzipped to text (fflate).
 *   • URLs            → fetched, stripped to text; og:images scraped as media.
 *   • Output          → strict JSON; draft written to import_jobs (status
 *                       'reviewing') only on success → existing Review Queue.
 *
 * Requires secret: ANTHROPIC_API_KEY.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

// Anthropic Messages API (raw HTTPS — robust in Deno, no SDK version pinning).
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const VERSION = "v6-claude-2026-06-26";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUCKET = "property-media";
const MODEL = "claude-opus-4-8";
const MIN_IMAGES = 5;
// Anthropic enforces a 32 MB TOTAL request cap (raw bytes after base64). Base64
// inflates payloads ~33%, so the sum of (pdf + images) raw bytes must stay well
// under 24 MB to avoid 413 "request_too_large".
const MAX_VISION_IMAGES = 3;             // keep the Claude request bounded (avoid 504/413)
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 18 * 1024 * 1024;  // ~24 MB after base64 — safely under Claude's 32 MB cap
const MAX_TOTAL_RAW_BYTES = 22 * 1024 * 1024; // hard ceiling for pdf+images combined (raw)
const CLAUDE_TIMEOUT_MS = 110000;        // abort before the gateway 504s

interface UploadFile { storage_path: string; name: string; mime: string; kind?: string; size?: number }

const SYSTEM = `You are a senior real-estate data extraction specialist and bilingual (English + Arabic) marketing copywriter for ASAS Properties, Dubai/UAE.
You receive property brochures/factsheets (as PDFs), images, and text. Read EVERYTHING, including tables, floor-plan unit mixes, payment plans, amenities and the marketing narrative.
Return ONLY one valid JSON object — no markdown fences, no commentary before or after.
Never invent data: use "" for unknown text and "TBA" for unknown price/size.
Write Arabic in formal Modern Standard Arabic (فصحى). Keep the pipe "|" separators identical between *_en and *_ar fields.
For handover_date use YYYY-MM-DD (Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31).`;

const PROMPT = (hint: string) => `Extract ALL property data${hint ? ` for "${hint}"` : ""} and return EXACTLY this JSON shape (no extra keys):
{
  "name_en":"", "name_ar":"",
  "tagline_en":"", "tagline_ar":"",
  "developer_en":"", "developer_ar":"",
  "location_en":"", "location_ar":"",
  "price_range":"from - to, e.g. AED 1.8M - 3.5M, or TBA",
  "size_range":"e.g. 780 - 1882 sqft or TBA",
  "unit_types":"pipe-separated, capture EVERY type incl. bedroom counts, e.g. 1BR|2BR|2BR+Study|3BR|Villa|Townhouse|Penthouse",
  "ownership_type":"Freehold or Leasehold",
  "type":"off-plan or ready",
  "handover_date":"YYYY-MM-DD or empty",
  "overview_en":"200-250 word editorial description", "overview_ar":"Arabic translation",
  "highlights_en":"8-10 pipe-separated key features", "highlights_ar":"same, in Arabic",
  "investment_en":"2-3 investor sentences", "investment_ar":"Arabic",
  "enduser_text_en":"2-3 resident/lifestyle sentences", "enduser_text_ar":"Arabic",
  "amenities":["Swimming Pool","Gym","Kids Play Area"],
  "payment_plan":[{"milestone_en":"On Booking","percentage":10,"sort_order":1}],
  "floor_plan_units":[{"type":"1 bed","size_sqft":"780","view":""}]
}
Rules: capture unit sizes in square feet (SQF) and bedroom counts; price_range is "from - to" when both are known; payment_plan reflects the brochure's plan (percentages may sum to 100); use [] for arrays you cannot fill. Output JSON only.`;

function parseJSON(raw: string): Record<string, unknown> {
  const t = (raw || "").trim();
  try { return JSON.parse(t); } catch { /* noop */ }
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) { try { return JSON.parse(f[1].trim()); } catch { /* noop */ } }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* noop */ } }
  return {};
}

function extractTextFromDocx(buffer: Uint8Array): string {
  try {
    const doc = unzipSync(buffer)["word/document.xml"];
    if (!doc) return "";
    return strFromU8(doc).replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n").trim();
  } catch { return ""; }
}

function htmlToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function scrapeImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  for (const tag of html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi) || []) {
    const m = tag.match(/content=["']([^"']+)["']/i); if (m) urls.add(m[1]);
  }
  for (const tag of html.match(/<img[^>]+src=["']([^"']+)["']/gi) || []) {
    const m = tag.match(/src=["']([^"']+)["']/i); if (!m) continue;
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) { try { u = new URL(u, baseUrl).href; } catch { continue; } }
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(u) && !/sprite|logo|icon|placeholder|blank/i.test(u)) urls.add(u);
  }
  return Array.from(urls).slice(0, 12);
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function imageMime(name: string, mime: string): string {
  if (mime && mime.startsWith("image/")) return mime === "image/jpg" ? "image/jpeg" : mime;
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function classifyKind(f: UploadFile): string {
  if (f.kind) return f.kind;
  const n = f.name.toLowerCase(), m = (f.mime || "").toLowerCase();
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(n)) return "video";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || m.includes("wordprocessingml")) return "docx";
  return "text";
}

function generateSlug(text: string): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").trim();
}

const VALID_COLUMNS = ["name_en","name_ar","slug","tagline_en","tagline_ar","developer_en","developer_ar","location_en","location_ar","price_range","size_range","unit_types","ownership_type","type","handover_date","overview_en","overview_ar","highlights_en","highlights_ar","video_url","status","is_featured","investment_en","investment_ar","enduser_text_en","enduser_text_ar"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return json({ ok: true, version: VERSION, model: MODEL });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not configured. Add it in Supabase → Edge Function secrets." }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const propertyHint = String(body.property_hint || "").trim();
    const pastedText = String(body.text || "").trim();
    const extractedTexts: string[] = (body.extracted_texts || []).map(String);
    const urls: string[] = (body.urls || []).map((u: string) => String(u).trim()).filter(Boolean);
    const files: UploadFile[] = (body.files || []).map((f: UploadFile) => ({ ...f, kind: classifyKind(f) }));

    if (!pastedText && extractedTexts.length === 0 && urls.length === 0 && files.length === 0)
      return json({ error: "Provide some text, a URL, or an uploaded file." }, 400);

    // Persist every chat extraction attempt (success or failure) as history.
    const logChat = async (status: "success" | "failed", extra: Record<string, unknown>) => {
      try {
        await supabaseAdmin.from("ai_chat_log").insert({
          status,
          prompt: pastedText.slice(0, 4000) || propertyHint || null,
          file_names: files.map((f) => f.name),
          urls,
          model: MODEL,
          ...extra,
        });
      } catch { /* logging must never break extraction */ }
    };

    const warnings: string[] = [];
    const textBlocks: string[] = [];
    const contentBlocks: unknown[] = [];   // Claude content blocks (PDF documents)
    const imageBlocks: unknown[] = [];     // image vision blocks (used only if no PDF)
    const pendingMedia: Record<string, unknown>[] = [];
    let videoUrl = "";
    let imgIndex = 0;
    let hasPdf = false;
    let totalRawBytes = 0;                  // running total of bytes sent to Claude

    if (pastedText) textBlocks.push(`--- Admin notes ---\n${pastedText}`);
    for (const t of extractedTexts) { const s = String(t || "").trim(); if (s) textBlocks.push(s.slice(0, 16000)); }

    // URLs → text + scraped images
    for (const url of urls) {
      if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) { if (!videoUrl) videoUrl = url; continue; }
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (ASAS Importer)" } });
        if (!r.ok) { warnings.push(`Couldn't fetch URL (${r.status}): ${url}`); continue; }
        const html = await r.text();
        const text = htmlToText(html);
        if (text.length > 80) textBlocks.push(`--- Web page: ${url} ---\n${text.slice(0, 12000)}`);
        for (const imgUrl of scrapeImageUrls(html, url)) {
          pendingMedia.push({ media_type: "render", original_filename: imgUrl.split("/").pop()?.split("?")[0] || "web-image.jpg", storage_url: imgUrl, dropbox_path: imgUrl, is_hero: false, sort_order: 50 + pendingMedia.length, compression_status: "done" });
        }
      } catch (e) { warnings.push(`Error fetching ${url}: ${String(e).slice(0, 100)}`); }
    }

    // Files
    for (const f of files) {
      try {
        if (f.kind === "video") {
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          pendingMedia.push({ media_type: "video", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 200, compression_status: "done" });
          continue;
        }

        if (f.kind === "pdf") {
          // Register the brochure WITHOUT downloading. Only download + base64 when
          // the PDF is small enough for Claude to read directly (its hard limit is
          // ~32MB / 100 pages) — otherwise we'd burn time/memory and risk a 504.
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          pendingMedia.push({ media_type: "brochure", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 300, compression_status: "done" });
          const sz = Number(f.size) || 0;
          if (sz > 0 && sz <= MAX_PDF_BYTES && totalRawBytes + sz <= MAX_TOTAL_RAW_BYTES) {
            const { data: pblob } = await supabaseAdmin.storage.from(BUCKET).download(f.storage_path);
            if (pblob) {
              const pbytes = new Uint8Array(await pblob.arrayBuffer());
              contentBlocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: toBase64(pbytes) }, title: f.name });
              totalRawBytes += pbytes.length;
              hasPdf = true;
            }
          } else {
            warnings.push(`"${f.name}" is too large for direct AI reading — extracting from its text and page images instead.`);
          }
          continue;
        }

        const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(f.storage_path);
        if (dlErr || !blob) { warnings.push(`Couldn't read uploaded file: ${f.name}`); continue; }
        const bytes = new Uint8Array(await blob.arrayBuffer());

        if (f.kind === "image") {
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          const isFloorplan = /floor|plan|layout/i.test(f.name);
          pendingMedia.push({
            media_type: isFloorplan ? "floorplan" : (imgIndex === 0 ? "hero" : "render"),
            original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path,
            is_hero: imgIndex === 0 && !isFloorplan, sort_order: imgIndex, compression_status: "done", original_size_bytes: bytes.length,
          });
          // Vision only if no PDF (PDFs already carry their images), under the cap,
          // and small enough — keeps the Claude request bounded → avoids 504.
          if (imageBlocks.length < MAX_VISION_IMAGES && bytes.length <= MAX_IMAGE_BYTES) {
            imageBlocks.push({ type: "image", source: { type: "base64", media_type: imageMime(f.name, f.mime), data: toBase64(bytes) } });
          }
          imgIndex++;
        } else if (f.kind === "docx") {
          const text = extractTextFromDocx(bytes);
          if (text.length > 30) textBlocks.push(`--- Word: ${f.name} ---\n${text.slice(0, 16000)}`);
          else warnings.push(`Couldn't read "${f.name}" — please paste its text.`);
        } else {
          textBlocks.push(`--- ${f.name} ---\n${new TextDecoder("utf-8").decode(bytes).slice(0, 16000)}`);
        }
      } catch (e) { warnings.push(`Error processing ${f.name}: ${String(e).slice(0, 100)}`); }
    }

    // ── Claude extraction (raw Messages API, with timeout + text-only retry) ──
    if (!hasPdf) for (const b of imageBlocks) contentBlocks.push(b);
    const sourceText = textBlocks.join("\n\n").slice(0, 60000);
    const promptText = PROMPT(propertyHint) + (sourceText ? `\n\nADDITIONAL TEXT FROM ADMIN / WEB:\n${sourceText}` : "");
    contentBlocks.push({ type: "text", text: promptText });

    const callClaude = async (blocks: unknown[]) => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
      try {
        const res = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
          body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: "user", content: blocks }] }),
          signal: controller.signal,
        });
        if (!res.ok) return { ok: false as const, status: res.status, err: (await res.text().catch(() => "")).slice(0, 200) };
        return { ok: true as const, status: 200, data: await res.json() };
      } catch (e) {
        return { ok: false as const, status: 0, err: (e as Error)?.name === "AbortError" ? "timeout" : String((e as Error)?.message || e).slice(0, 200) };
      } finally { clearTimeout(to); }
    };

    let record: Record<string, unknown> = {};
    let r = await callClaude(contentBlocks);
    // If the document/image request failed (too large/long → 400, or slow → timeout),
    // retry with extracted text only so we still return a usable draft.
    if (!r.ok && (r.status === 400 || r.err === "timeout") && (hasPdf || imageBlocks.length > 0)) {
      warnings.push(r.err === "timeout" ? "Direct read timed out — retried with extracted text." : "Direct read failed — retried with extracted text.");
      r = await callClaude([{ type: "text", text: promptText }]);
    }
    if (!r.ok) {
      if (r.status === 401) { await logChat("failed", { error: "ANTHROPIC_API_KEY invalid" }); return json({ error: "ANTHROPIC_API_KEY is invalid (401). Check the key in Supabase secrets." }, 500); }
      if (r.status === 429) { await logChat("failed", { error: "rate limit" }); return json({ error: "Claude rate limit reached — please retry shortly." }, 429); }
      const msg = r.err === "timeout"
        ? "Extraction took too long. For very large PDFs, paste the key details or upload a shorter brochure."
        : `Claude API error${r.status ? " " + r.status : ""}: ${r.err}`;
      await logChat("failed", { error: msg });
      return json({ error: msg }, 502);
    }
    if (r.data.stop_reason === "refusal") warnings.push("Claude declined to process this content.");
    else {
      const textOut = (r.data.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
      record = parseJSON(textOut);
    }

    // Defaults / normalisation
    if (!record.name_en) record.name_en = propertyHint || "Untitled Property";
    record.slug = generateSlug((record.name_en as string) || propertyHint || "property") || `property-${Date.now()}`;
    if (!record.type || !["off-plan", "ready"].includes(record.type as string)) record.type = "off-plan";
    record.status = "available";
    if (record.is_featured === undefined) record.is_featured = false;
    if (videoUrl) record.video_url = videoUrl;

    const paymentMilestones = Array.isArray(record.payment_plan) ? record.payment_plan as unknown[] : [];
    const amenitiesList = Array.isArray(record.amenities) ? record.amenities as unknown[] : [];

    const DATE_COLS = new Set(["handover_date"]);
    const row: Record<string, unknown> = {};
    for (const col of VALID_COLUMNS) {
      const v = record[col];
      if (v === undefined || v === null) continue;
      if (DATE_COLS.has(col)) { const s = String(v).trim(); row[col] = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
      else if ((col === "price_range" || col === "size_range") && String(v) === "TBA") row[col] = null;
      else row[col] = v;
    }

    const REQUIRED = [
      ["name_en", "Project name"], ["developer_en", "Developer"], ["overview_en", "Description"],
      ["unit_types", "Unit types"], ["size_range", "Size (SQF)"], ["type", "Status (off-plan/ready)"], ["price_range", "Price range"],
    ] as const;
    const missingFields = REQUIRED.filter(([k]) => { const v = row[k]; return v === undefined || v === null || v === "" || v === "TBA"; }).map(([, l]) => l);

    const seen = new Set<string>();
    const media = pendingMedia.filter((m) => { const k = String(m.dropbox_path || m.storage_url); if (seen.has(k)) return false; seen.add(k); return true; });
    const imageCount = media.filter((m) => ["hero", "render", "floorplan"].includes(m.media_type as string)).length;
    const videoCount = media.filter((m) => m.media_type === "video").length + (videoUrl ? 1 : 0);
    const imagesNeeded = Math.max(0, MIN_IMAGES - imageCount);
    const manualTodo = { fields: missingFields, images_found: imageCount, images_needed: imagesNeeded, warnings };

    const { data: job, error: insErr } = await supabaseAdmin.from("import_jobs").insert({
      ...row,
      source_type: "chat",
      dropbox_folder_path: `chat:${crypto.randomUUID()}`,
      folder_name: (row.name_en as string) || propertyHint || "AI Chat Import",
      import_status: "reviewing",
      image_count: imageCount,
      video_count: videoCount,
      manual_todo: manualTodo,
      chat_sources: { text: pastedText.slice(0, 4000), urls, files: files.map((f) => ({ name: f.name, kind: f.kind })) },
      ai_extraction_raw: { ...record, _payment_milestones: paymentMilestones, _amenities: amenitiesList, _model: MODEL, _source: "chat" },
    }).select("id").single();

    if (insErr || !job) throw new Error(`Could not save draft: ${insErr?.message || "unknown"}`);
    const jobId = job.id;

    if (media.length > 0) {
      const rows = media.map((m) => ({ ...m, job_id: jobId }));
      for (let i = 0; i < rows.length; i += 50) await supabaseAdmin.from("import_media").insert(rows.slice(i, i + 50));
    }
    try { await supabaseAdmin.from("import_logs").insert({ job_id: jobId, action: "chat_extract", details: `Claude (${MODEL}). Missing: ${missingFields.length}. Images: ${imageCount}/${MIN_IMAGES}.`, level: missingFields.length || imagesNeeded ? "warning" : "success" }); } catch { /* noop */ }

    const name = (row.name_en as string) || propertyHint || "this property";
    const lines = [`I've drafted **${name}**${row.developer_en ? ` by ${row.developer_en}` : ""}.`];
    if (row.location_en) lines.push(`📍 ${row.location_en}`);
    if (row.price_range) lines.push(`💰 ${row.price_range}`);
    if (row.unit_types) lines.push(`🏠 Units: ${String(row.unit_types).replace(/\|/g, ", ")}`);
    lines.push(`🖼️ ${imageCount} image(s) attached${imagesNeeded ? ` — upload ${imagesNeeded} more to reach ${MIN_IMAGES}.` : "."}`);
    lines.push(missingFields.length ? `⚠️ Couldn't extract: **${missingFields.join(", ")}** — add these in review.` : `✅ All key fields extracted. Open it in the Review Queue to approve & publish.`);

    await logChat("success", { job_id: jobId, assistant_message: lines.join("\n") });

    return json({
      success: true, job_id: jobId, assistant_message: lines.join("\n"),
      property: row, manual_todo: manualTodo, image_count: imageCount,
      payment_milestones: paymentMilestones, amenities: amenitiesList, warnings,
    });
  } catch (e) {
    console.error("chat-extract error:", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
