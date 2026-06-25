/**
 * chat-extract — Supabase Edge Function  (V2 — single-pass, fast & reliable)
 *
 * Powers the admin "AI Property Chat" box. The admin uploads PDFs, images,
 * Word docs, text or videos (already pushed to the `property-media` bucket by
 * the browser) and/or pastes property URLs / free text.
 *
 * Design goals (V2):
 *   • ONE multimodal AI call (text + images + Arabic in a single request) —
 *     no separate vision / translation passes. Faster, far fewer failure points.
 *   • The draft import_jobs row is created ONLY at the end, on success, directly
 *     in status 'reviewing'. Nothing half-baked is ever left for the old
 *     Google-Drive pipeline to pick up.
 *   • No dependency on the old extract-property / extract-chunk / Drive flow.
 *
 * Requires secret: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud).
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUCKET = "property-media";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MIN_IMAGES = 5;
const MAX_VISION_IMAGES = 5; // cap inline images for speed

interface UploadFile { storage_path: string; name: string; mime: string; kind?: string }

// ── single bilingual extraction call ─────────────────────────────────────────
const SYSTEM = `You are a senior real-estate data extractor and bilingual (English + Arabic) copywriter for ASAS Properties, Dubai/UAE.
You receive property text and/or images (brochures, factsheets, floor plans, renders).
Return ONLY one valid JSON object — no markdown fences, no commentary.
Never invent data: use "" for unknown text and "TBA" for unknown price/size.
Write Arabic fields in formal Modern Standard Arabic (فصحى). Keep the pipe "|" separators identical between *_en and *_ar.
For handover_date use YYYY-MM-DD (Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31).`;

const SCHEMA_PROMPT = (hint: string) => `Extract ALL property data${hint ? ` for "${hint}"` : ""} and return EXACTLY this JSON shape:
{
  "name_en":"", "name_ar":"",
  "tagline_en":"", "tagline_ar":"",
  "developer_en":"", "developer_ar":"",
  "location_en":"", "location_ar":"",
  "price_range":"e.g. AED 1.0M - 3.5M or TBA",
  "size_range":"e.g. 750 - 2500 sqft or TBA",
  "unit_types":"pipe-separated, capture EVERY type e.g. Studio|1BR|2BR|3BR|Villa|Townhouse|Penthouse",
  "ownership_type":"Freehold or Leasehold",
  "type":"off-plan or ready",
  "handover_date":"YYYY-MM-DD or empty",
  "overview_en":"200-250 word editorial description", "overview_ar":"Arabic translation",
  "highlights_en":"8-10 pipe-separated features", "highlights_ar":"same, in Arabic",
  "investment_en":"2-3 investor sentences", "investment_ar":"Arabic",
  "enduser_text_en":"2-3 resident sentences", "enduser_text_ar":"Arabic",
  "amenities":["Swimming Pool","Gym"],
  "payment_plan":[{"milestone_en":"On Booking","percentage":20,"sort_order":1}],
  "floor_plan_units":[{"type":"1BR","size_sqft":"750","view":"Sea View"}]
}
Rules: capture unit sizes in square feet (SQF) and the room count inside the type label. price_range must be "from - to" when both are known. payment_plan percentages should sum to 100; use [] if unknown. Output JSON only.`;

async function callAI(userContent: unknown, maxTokens = 6000): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL, max_tokens: maxTokens,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded — please retry shortly");
    if (res.status === 402) throw new Error("AI credits exhausted — add funds in Lovable workspace settings");
    throw new Error(`AI Gateway ${res.status}: ${err.slice(0, 300)}`);
  }
  return ((await res.json()).choices?.[0]?.message?.content ?? "").trim();
}

function parseJSON(raw: string): Record<string, unknown> {
  const t = (raw || "").trim();
  try { return JSON.parse(t); } catch { /* noop */ }
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) { try { return JSON.parse(f[1].trim()); } catch { /* noop */ } }
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* noop */ } }
  return {};
}

// ── source extractors ─────────────────────────────────────────────────────────
function extractTextFromPdfBuffer(buffer: Uint8Array): string {
  try {
    const raw = new TextDecoder("latin1").decode(buffer);
    if (!raw.startsWith("%PDF")) return "";
    const out: string[] = [];
    const btEt = /BT\s([\s\S]{1,50000}?)ET/g;
    let m: RegExpExecArray | null, n = 0;
    const KEEP = /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g;
    while ((m = btEt.exec(raw)) !== null && n++ < 5000) {
      const block = m[1];
      try {
        const paren = /\(([^)]{0,500})\)\s*T[jJ]/g;
        let s: RegExpExecArray | null;
        while ((s = paren.exec(block)) !== null) {
          const c = s[1].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\").replace(KEEP, "").trim();
          if (c) out.push(c);
        }
        const tj = /\[((?:\([^)]{0,500}\)|<[^>]{0,200}>|[^[\]]{0,100})*)\]\s*TJ/gi;
        let t: RegExpExecArray | null;
        while ((t = tj.exec(block)) !== null) {
          const parts = t[1].match(/\(([^)]{0,500})\)/g);
          if (parts) {
            const c = parts.map((p) => p.slice(1, -1).replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")).join("").replace(KEEP, "").trim();
            if (c) out.push(c);
          }
        }
      } catch { continue; }
    }
    const lines: string[] = []; let prev = "";
    for (const c of out) { const cl = c.trim(); if (cl && cl !== prev && cl.length > 1) { lines.push(cl); prev = cl; } }
    return lines.join("\n");
  } catch { return ""; }
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

function mimeForImage(name: string, mime: string): string {
  if (mime && mime.startsWith("image/")) return mime;
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

// ── handler ───────────────────────────────────────────────────────────────────
const VERSION = "v3-clientpdf-2026-06-25";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Unauthenticated health/version probe — lets us verify which build is live.
  if (req.method === "GET") return json({ ok: true, version: VERSION });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const propertyHint = String(body.property_hint || "").trim();
    const pastedText = String(body.text || "").trim();
    const urls: string[] = (body.urls || []).map((u: string) => String(u).trim()).filter(Boolean);
    const files: UploadFile[] = (body.files || []).map((f: UploadFile) => ({ ...f, kind: classifyKind(f) }));

    if (!pastedText && urls.length === 0 && files.length === 0)
      return json({ error: "Provide some text, a URL, or an uploaded file." }, 400);

    const warnings: string[] = [];
    const textBlocks: string[] = [];
    const imageParts: { url: string }[] = [];
    const pendingMedia: Record<string, unknown>[] = [];
    let videoUrl = "";
    let imgIndex = 0;

    if (pastedText) textBlocks.push(`--- Admin notes ---\n${pastedText}`);

    // Text extracted in the browser (pdf.js) — heavy PDF parsing stays off the edge function
    for (const t of (body.extracted_texts || [])) { const s = String(t || "").trim(); if (s) textBlocks.push(s.slice(0, 16000)); }

    // URLs → text + scraped images (+ video links)
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

    // Uploaded files
    for (const f of files) {
      try {
        if (f.kind === "video") {
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          pendingMedia.push({ media_type: "video", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 200, compression_status: "done" });
          continue;
        }
        if (f.kind === "pdf") {
          // Text comes from the browser via extracted_texts. NEVER download/parse the PDF
          // here — that hit the edge runtime resource limit (HTTP 546).
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          pendingMedia.push({ media_type: "brochure", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 300, compression_status: "done" });
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
            is_hero: imgIndex === 0 && !isFloorplan, sort_order: imgIndex, compression_status: "done",
            original_size_bytes: bytes.length,
          });
          if (imageParts.length < MAX_VISION_IMAGES)
            imageParts.push({ url: `data:${mimeForImage(f.name, f.mime)};base64,${toBase64(bytes)}` });
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

    // ── ONE combined multimodal AI call ──────────────────────────────────────
    let record: Record<string, unknown> = {};
    const sourceText = textBlocks.join("\n\n").slice(0, 48000);
    if (textBlocks.length > 0 || imageParts.length > 0) {
      const userContent: unknown = imageParts.length > 0
        ? [
            ...imageParts.map((p) => ({ type: "image_url", image_url: p })),
            { type: "text", text: SCHEMA_PROMPT(propertyHint) + (sourceText ? `\n\nSOURCE TEXT:\n${sourceText}` : "\n\nExtract everything visible in the image(s).") },
          ]
        : SCHEMA_PROMPT(propertyHint) + `\n\nSOURCE TEXT:\n${sourceText}`;
      try {
        record = parseJSON(await callAI(userContent));
      } catch (e) {
        warnings.push(`AI extraction failed: ${String(e).slice(0, 160)}`);
        // one retry, text-only, smaller
        if (sourceText) { try { record = parseJSON(await callAI(SCHEMA_PROMPT(propertyHint) + `\n\nSOURCE TEXT:\n${sourceText.slice(0, 20000)}`, 4000)); } catch { /* noop */ } }
      }
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

    // Build the column-safe row
    const DATE_COLS = new Set(["handover_date"]);
    const row: Record<string, unknown> = {};
    for (const col of VALID_COLUMNS) {
      const v = record[col];
      if (v === undefined || v === null) continue;
      if (DATE_COLS.has(col)) { const s = String(v).trim(); row[col] = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
      else if ((col === "price_range" || col === "size_range") && String(v) === "TBA") row[col] = null;
      else row[col] = v;
    }

    // manual_todo
    const REQUIRED = [
      ["name_en", "Project name"], ["developer_en", "Developer"], ["overview_en", "Description"],
      ["unit_types", "Unit types"], ["size_range", "Size (SQF)"], ["type", "Status (off-plan/ready)"], ["price_range", "Price range"],
    ] as const;
    const missingFields = REQUIRED.filter(([k]) => { const v = row[k]; return v === undefined || v === null || v === "" || v === "TBA"; }).map(([, l]) => l);

    // de-dupe media
    const seen = new Set<string>();
    const media = pendingMedia.filter((m) => { const k = String(m.dropbox_path || m.storage_url); if (seen.has(k)) return false; seen.add(k); return true; });
    const imageCount = media.filter((m) => ["hero", "render", "floorplan"].includes(m.media_type as string)).length;
    const videoCount = media.filter((m) => m.media_type === "video").length + (videoUrl ? 1 : 0);
    const imagesNeeded = Math.max(0, MIN_IMAGES - imageCount);

    const manualTodo = { fields: missingFields, images_found: imageCount, images_needed: imagesNeeded, warnings };

    // ── create the draft job NOW (only on success), directly as 'reviewing' ───
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
      ai_extraction_raw: { ...record, _payment_milestones: paymentMilestones, _amenities: amenitiesList, _ai_model: AI_MODEL, _source: "chat" },
    }).select("id").single();

    if (insErr || !job) throw new Error(`Could not save draft: ${insErr?.message || "unknown"}`);
    const jobId = job.id;

    if (media.length > 0) {
      const rows = media.map((m) => ({ ...m, job_id: jobId }));
      for (let i = 0; i < rows.length; i += 50) await supabaseAdmin.from("import_media").insert(rows.slice(i, i + 50));
    }
    try { await supabaseAdmin.from("import_logs").insert({ job_id: jobId, action: "chat_extract", details: `Single-pass draft. Missing: ${missingFields.length}. Images: ${imageCount}/${MIN_IMAGES}.`, level: missingFields.length || imagesNeeded ? "warning" : "success" }); } catch { /* noop */ }

    // friendly summary
    const name = (row.name_en as string) || propertyHint || "this property";
    const lines = [`I've drafted **${name}**${row.developer_en ? ` by ${row.developer_en}` : ""}.`];
    if (row.location_en) lines.push(`📍 ${row.location_en}`);
    if (row.price_range) lines.push(`💰 ${row.price_range}`);
    if (row.unit_types) lines.push(`🏠 Units: ${String(row.unit_types).replace(/\|/g, ", ")}`);
    lines.push(`🖼️ ${imageCount} image(s) attached${imagesNeeded ? ` — upload ${imagesNeeded} more to reach ${MIN_IMAGES}.` : "."}`);
    lines.push(missingFields.length ? `⚠️ Couldn't extract: **${missingFields.join(", ")}** — add these in review.` : `✅ All key fields extracted. Open it in the Review Queue to approve & publish.`);

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
