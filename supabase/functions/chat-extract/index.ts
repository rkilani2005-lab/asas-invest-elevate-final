/**
 * chat-extract — Supabase Edge Function
 *
 * Powers the admin "AI Property Chat" box. The admin uploads PDFs, images,
 * Word docs, text or videos (already pushed to the `property-media` bucket by
 * the browser) and/or pastes property URLs / free text. This function:
 *
 *   1. Pulls text from every source (pasted text, URL pages, PDF, DOCX, TXT).
 *   2. Runs Gemini vision over uploaded images (floor plans / renders / brochures).
 *   3. Merges everything into one property record + Arabic translation.
 *   4. Registers the uploaded images (and og:images scraped from URLs) as media.
 *   5. Writes a DRAFT into import_jobs (import_status='reviewing') so it lands in
 *      the existing Review Queue for admin approval & publishing.
 *   6. Reports any fields it could NOT extract (and <5 images) as `manual_todo`
 *      so the UI can ask the admin to supply them by hand.
 *
 * Reuses the same Lovable AI Gateway (Gemini) + prompts as extract-property /
 * extract-chunk. Requires secret: LOVABLE_API_KEY (auto-provisioned by Lovable).
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "property-media";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MIN_IMAGES = 5;
const MAX_VISION_IMAGES = 6; // cap vision calls for cost/latency

// ── Types ───────────────────────────────────────────────────────────────────
interface UploadFile {
  storage_path: string; // path within the property-media bucket
  name: string;
  mime: string;
  kind?: "image" | "pdf" | "docx" | "text" | "video";
}
interface ChatExtractBody {
  job_id?: string;
  property_hint?: string;
  text?: string;
  urls?: string[];
  files?: UploadFile[];
}

// ── AI helpers ──────────────────────────────────────────────────────────────
async function callAI(
  systemPrompt: string,
  userContent: unknown,
  maxTokens = 4096,
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded — please retry shortly");
    if (res.status === 402) throw new Error("AI credits exhausted — add funds in Lovable workspace settings");
    throw new Error(`AI Gateway ${res.status}: ${err.slice(0, 400)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

const EXTRACTION_SYSTEM = `You are a professional real estate data extraction specialist for ASAS Properties, Dubai.
Return ONLY valid JSON - no markdown fences, no explanations, no trailing text.
Never fabricate data. Use "" for missing text, "TBA" for unknown price/size.
For handover_date: Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31 of the stated year.`;

const COMBINED_EXTRACTION_PROMPT = (hint: string) => `Extract ALL property data${hint ? ` for: "${hint}"` : ""}.

Return ONLY this exact JSON (no markdown, no explanation):
{
  "name_en": "Property name",
  "tagline_en": "Marketing headline under 100 chars",
  "developer_en": "Developer company name",
  "location_en": "Area and city e.g. Dubai Marina, Dubai",
  "price_range": "e.g. AED 1.2M - 3.5M or TBA",
  "size_range": "e.g. 750 - 2500 sqft or TBA",
  "unit_types": "Pipe-separated e.g. Studio|1BR|2BR|3BR|Villa|Townhouse",
  "ownership_type": "Freehold or Leasehold",
  "type": "off-plan or ready",
  "handover_date": "YYYY-MM-DD or empty string",
  "overview_en": "200-250 word editorial description",
  "highlights_en": "8-10 pipe-separated key features",
  "investment_en": "2-3 sentences for investors",
  "enduser_text_en": "2-3 sentences for residents",
  "amenities": ["Swimming Pool", "Gym", "Kids Play Area"],
  "payment_plan": [
    {"milestone_en": "On Booking", "percentage": 20, "sort_order": 1},
    {"milestone_en": "During Construction", "percentage": 40, "sort_order": 2},
    {"milestone_en": "On Handover", "percentage": 40, "sort_order": 3}
  ],
  "floor_plan_units": [{"type": "1BR", "size_sqft": "750", "view": "Sea View"}]
}
Rules: unit_types must capture every unit type mentioned (Villas, Apartments, Townhouses, Studios, Penthouses, etc.).
For size_sqft find the size in square feet (SQF) and number of rooms in the type label. payment_plan percentages must sum to 100; return [] if not found. Never invent data.`;

const ARABIC_SYSTEM = `You are an Arabic marketing copywriter specialised in UAE real estate.
Write Modern Standard Arabic (MSA) that is formal yet compelling for Gulf investors.
Keep pipe separators (|) in highlights_ar exactly as in the English source.
Return JSON only - no text before or after.`;

const ARABIC_PROMPT = (fields: Record<string, string>) =>
  `Translate this real estate marketing content to high-quality Arabic MSA:\n${JSON.stringify(fields, null, 2)}\n\nReturn JSON with these keys only:\nname_ar, developer_ar, location_ar, tagline_ar, overview_ar, highlights_ar, investment_ar, enduser_text_ar\n\nUse "" for any field not present in the source data.`;

// ── JSON parser (3 fallbacks) ────────────────────────────────────────────────
function parseJSON(raw: string): Record<string, unknown> {
  const text = (raw || "").trim();
  try { return JSON.parse(text); } catch { /* noop */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* noop */ } }
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s !== -1 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch { /* noop */ } }
  return {};
}

// ── Source extractors ─────────────────────────────────────────────────────────
function extractTextFromPdfBuffer(buffer: Uint8Array): string {
  try {
    const raw = new TextDecoder("latin1").decode(buffer);
    if (!raw.startsWith("%PDF")) return "";
    const out: string[] = [];
    const btEt = /BT\s([\s\S]{1,50000}?)ET/g;
    let m: RegExpExecArray | null, n = 0;
    // Strip binary/control garbage, keep printable ASCII + Latin-1 (English/AR handled downstream)
    const KEEP = /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g;
    while ((m = btEt.exec(raw)) !== null && n++ < 5000) {
      const block = m[1];
      try {
        const paren = /\(([^)]{0,500})\)\s*T[jJ]/g;
        let s: RegExpExecArray | null;
        while ((s = paren.exec(block)) !== null) {
          const dec = s[1].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
            .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
          const clean = dec.replace(KEEP, "").trim();
          if (clean) out.push(clean);
        }
        const tj = /\[((?:\([^)]{0,500}\)|<[^>]{0,200}>|[^[\]]{0,100})*)\]\s*TJ/gi;
        let t: RegExpExecArray | null;
        while ((t = tj.exec(block)) !== null) {
          const parts = t[1].match(/\(([^)]{0,500})\)/g);
          if (parts) {
            const line = parts.map((p) => p.slice(1, -1).replace(/\\n/g, "\n").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")).join("");
            const clean = line.replace(KEEP, "").trim();
            if (clean) out.push(clean);
          }
        }
      } catch { continue; }
    }
    const lines: string[] = [];
    let prev = "";
    for (const c of out) { const cl = c.trim(); if (cl && cl !== prev && cl.length > 1) { lines.push(cl); prev = cl; } }
    return lines.join("\n");
  } catch { return ""; }
}

function extractTextFromDocx(buffer: Uint8Array): string {
  try {
    const files = unzipSync(buffer);
    const doc = files["word/document.xml"];
    if (!doc) return "";
    const xml = strFromU8(doc);
    return xml
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch { return ""; }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scrapeImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi) || [];
  for (const tag of og) { const m = tag.match(/content=["']([^"']+)["']/i); if (m) urls.add(m[1]); }
  const imgs = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
  for (const tag of imgs) {
    const m = tag.match(/src=["']([^"']+)["']/i);
    if (!m) continue;
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    else if (u.startsWith("/")) { try { u = new URL(u, baseUrl).href; } catch { continue; } }
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(u) && !/sprite|logo|icon|placeholder|blank/i.test(u)) urls.add(u);
  }
  return Array.from(urls).slice(0, 12);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(binary);
}

function classifyKind(f: UploadFile): UploadFile["kind"] {
  if (f.kind) return f.kind;
  const n = f.name.toLowerCase(), m = (f.mime || "").toLowerCase();
  if (m.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/.test(n)) return "video";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || m.includes("wordprocessingml")) return "docx";
  if (m.startsWith("text/") || n.endsWith(".txt")) return "text";
  return "text";
}

function generateSlug(text: string): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").trim();
}

// Fill empty fields of `base` from `extra`
function fillFrom(base: Record<string, unknown>, extra: Record<string, unknown>) {
  for (const [k, v] of Object.entries(extra)) {
    const cur = base[k];
    const empty = cur === undefined || cur === null || cur === "" || cur === "TBA" ||
      (Array.isArray(cur) && cur.length === 0);
    const hasVal = v !== undefined && v !== null && v !== "" && v !== "TBA" &&
      !(Array.isArray(v) && v.length === 0);
    if (empty && hasVal) base[k] = v;
  }
}

const VALID_COLUMNS = ["name_en","name_ar","slug","tagline_en","tagline_ar","developer_en","developer_ar","location_en","location_ar","price_range","size_range","unit_types","ownership_type","type","handover_date","overview_en","overview_ar","highlights_en","highlights_ar","video_url","status","is_featured","investment_en","investment_ar","enduser_text_en","enduser_text_ar"];

async function log(supabase: any, jobId: string, action: string, details: string, level = "info") {
  try { await supabase.from("import_logs").insert({ job_id: jobId, action, details, level }); } catch { /* noop */ }
  console.log(`[chat-extract][${level}] ${action}: ${details}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as ChatExtractBody;
    const propertyHint = (body.property_hint || "").trim();
    const pastedText = (body.text || "").trim();
    const urls = (body.urls || []).map((u) => u.trim()).filter(Boolean);
    const files = (body.files || []).map((f) => ({ ...f, kind: classifyKind(f) }));

    if (!pastedText && urls.length === 0 && files.length === 0) {
      return new Response(JSON.stringify({ error: "Provide at least some text, a URL, or an uploaded file." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Create or load the draft job
    let jobId = body.job_id || "";
    if (!jobId) {
      const { data: job, error } = await supabaseAdmin.from("import_jobs").insert({
        source_type: "chat",
        dropbox_folder_path: `chat:${crypto.randomUUID()}`,
        folder_name: propertyHint || "AI Chat Import",
        import_status: "extracting",
        chat_sources: { text: pastedText ? pastedText.slice(0, 4000) : "", urls, files: files.map((f) => ({ name: f.name, kind: f.kind })) },
      }).select("id").single();
      if (error || !job) throw new Error(`Could not create draft job: ${error?.message || "unknown"}`);
      jobId = job.id;
    } else {
      await supabaseAdmin.from("import_jobs").update({ import_status: "extracting" }).eq("id", jobId);
    }

    await log(supabase, jobId, "chat_start", `Chat import: ${files.length} file(s), ${urls.length} URL(s), ${pastedText ? "pasted text" : "no text"}`);

    const warnings: string[] = [];
    const textBlocks: string[] = [];
    const imageBase64: string[] = [];
    const mediaRows: Record<string, unknown>[] = [];
    let videoUrl = "";

    if (pastedText) textBlocks.push(`--- Pasted by admin ---\n${pastedText}`);

    // 2a. Fetch + parse URLs
    for (const url of urls) {
      // YouTube/Vimeo → video URL, not a text source
      if (/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) { if (!videoUrl) videoUrl = url; continue; }
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (ASAS Importer)" } });
        if (!r.ok) { warnings.push(`Could not fetch URL (${r.status}): ${url}`); continue; }
        const html = await r.text();
        const text = htmlToText(html);
        if (text.length > 80) textBlocks.push(`--- Web page: ${url} ---\n${text.slice(0, 12000)}`);
        for (const imgUrl of scrapeImageUrls(html, url)) {
          mediaRows.push({ job_id: jobId, media_type: "render", original_filename: imgUrl.split("/").pop()?.split("?")[0] || "web-image.jpg", storage_url: imgUrl, dropbox_path: imgUrl, is_hero: false, sort_order: 50 + mediaRows.length, compression_status: "done" });
        }
        await log(supabase, jobId, "url_read", `Read ${text.length} chars from ${url}`, "success");
      } catch (e) { warnings.push(`Error fetching ${url}: ${String(e).slice(0, 120)}`); }
    }

    // 2b. Files from storage
    let imgIndex = 0;
    for (const f of files) {
      try {
        if (f.kind === "video") {
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          mediaRows.push({ job_id: jobId, media_type: "video", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 200, compression_status: "done" });
          continue;
        }

        const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(f.storage_path);
        if (dlErr || !blob) { warnings.push(`Could not read uploaded file: ${f.name}`); continue; }
        const bytes = new Uint8Array(await blob.arrayBuffer());

        if (f.kind === "image") {
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          const isFloorplan = /floor|plan|layout/i.test(f.name);
          mediaRows.push({
            job_id: jobId, media_type: isFloorplan ? "floorplan" : (imgIndex === 0 ? "hero" : "render"),
            original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path,
            is_hero: imgIndex === 0 && !isFloorplan, sort_order: imgIndex, compression_status: "done",
            original_size_bytes: bytes.length,
          });
          if (imageBase64.length < MAX_VISION_IMAGES) imageBase64.push(toBase64(bytes));
          imgIndex++;
        } else if (f.kind === "pdf") {
          const text = extractTextFromPdfBuffer(bytes);
          if (text.length > 50) { textBlocks.push(`--- PDF: ${f.name} ---\n${text.slice(0, 14000)}`); await log(supabase, jobId, "pdf_read", `Extracted ${text.length} chars from ${f.name}`, "success"); }
          else warnings.push(`PDF "${f.name}" appears image-only — little text extracted. Consider uploading its key pages as images.`);
          // also keep the brochure as a downloadable
          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(f.storage_path);
          mediaRows.push({ job_id: jobId, media_type: "brochure", original_filename: f.name, storage_url: pub.publicUrl, dropbox_path: f.storage_path, is_hero: false, sort_order: 300, compression_status: "done" });
        } else if (f.kind === "docx") {
          const text = extractTextFromDocx(bytes);
          if (text.length > 30) { textBlocks.push(`--- Word doc: ${f.name} ---\n${text.slice(0, 14000)}`); await log(supabase, jobId, "docx_read", `Extracted ${text.length} chars from ${f.name}`, "success"); }
          else warnings.push(`Could not read text from "${f.name}". Please paste its contents into the chat.`);
        } else { // text
          textBlocks.push(`--- ${f.name} ---\n${new TextDecoder("utf-8").decode(bytes).slice(0, 14000)}`);
        }
      } catch (e) { warnings.push(`Error processing ${f.name}: ${String(e).slice(0, 120)}`); }
    }

    // 3. AI extraction — text first, then vision to fill gaps
    await supabaseAdmin.from("import_jobs").update({ import_status: "extracting" }).eq("id", jobId);
    let record: Record<string, unknown> = {};
    let paymentMilestones: unknown[] = [];
    let amenitiesList: unknown[] = [];

    if (textBlocks.length > 0) {
      try {
        const raw = await callAI(EXTRACTION_SYSTEM, COMBINED_EXTRACTION_PROMPT(propertyHint) + `\n\nSOURCE CONTENT:\n${textBlocks.join("\n\n").slice(0, 40000)}`);
        record = parseJSON(raw);
        await log(supabase, jobId, "ai_text", `Text extraction: ${Object.keys(record).length} fields`, "success");
      } catch (e) { warnings.push(`Text extraction failed: ${String(e).slice(0, 160)}`); }
    }

    if (imageBase64.length > 0) {
      try {
        const parts: unknown[] = imageBase64.map((b64) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }));
        parts.push({ type: "text", text: COMBINED_EXTRACTION_PROMPT(propertyHint) + "\n\nExtract everything visible in these property images (renders, floor plans, amenity boards, price/size tables)." });
        const raw = await callAI(EXTRACTION_SYSTEM, parts);
        const visionRec = parseJSON(raw);
        if (Object.keys(record).length === 0) record = visionRec;
        else fillFrom(record, visionRec);
        await log(supabase, jobId, "ai_vision", `Vision extraction over ${imageBase64.length} image(s)`, "success");
      } catch (e) { warnings.push(`Image extraction failed: ${String(e).slice(0, 160)}`); }
    }

    if (Object.keys(record).length === 0) record = { name_en: propertyHint || "" };

    paymentMilestones = Array.isArray(record.payment_plan) ? (record.payment_plan as unknown[]) : [];
    amenitiesList = Array.isArray(record.amenities) ? (record.amenities as unknown[]) : [];

    // 4. Arabic translation
    const arMap: Record<string, string> = { name_en: "name_ar", developer_en: "developer_ar", location_en: "location_ar", tagline_en: "tagline_ar", overview_en: "overview_ar", highlights_en: "highlights_ar", investment_en: "investment_ar", enduser_text_en: "enduser_text_ar" };
    const toTranslate: Record<string, string> = {};
    for (const enKey of Object.keys(arMap)) { const v = (record[enKey] as string) || ""; if (v.trim() && v !== "TBA") toTranslate[enKey] = v; }
    if (Object.keys(toTranslate).length > 0) {
      try {
        const arabic = parseJSON(await callAI(ARABIC_SYSTEM, ARABIC_PROMPT(toTranslate)));
        for (const [k, v] of Object.entries(arabic)) { if ((v as string)?.trim()) record[k] = v; }
        await log(supabase, jobId, "arabic", `Translated ${Object.keys(toTranslate).length} fields to Arabic`, "success");
      } catch (e) { warnings.push(`Arabic translation failed: ${String(e).slice(0, 140)}`); }
    }

    // 5. Normalise + save draft
    if (!record.slug) record.slug = generateSlug((record.name_en as string) || propertyHint || "property");
    if (!record.status) record.status = "available";
    if (record.is_featured === undefined) record.is_featured = false;
    if (videoUrl) record.video_url = videoUrl;
    if (record.type && !["off-plan", "ready"].includes(record.type as string)) record.type = "off-plan";

    const DATE_COLUMNS = new Set(["handover_date"]);
    const safeUpdate: Record<string, unknown> = {};
    for (const col of VALID_COLUMNS) {
      if (record[col] !== undefined && record[col] !== null) {
        if (DATE_COLUMNS.has(col)) { const val = String(record[col]).trim(); safeUpdate[col] = /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null; }
        else if (col === "price_range" || col === "size_range") { const v = String(record[col]); safeUpdate[col] = v === "TBA" ? null : record[col]; }
        else safeUpdate[col] = record[col];
      }
    }

    // 6. Register media (dedupe by storage path/url)
    const seen = new Set<string>();
    const dedupMedia = mediaRows.filter((m) => { const k = String(m.dropbox_path || m.storage_url); if (seen.has(k)) return false; seen.add(k); return true; });
    const imageCount = dedupMedia.filter((m) => ["hero", "render", "floorplan"].includes(m.media_type as string)).length;
    const videoCount = dedupMedia.filter((m) => m.media_type === "video").length + (videoUrl ? 1 : 0);

    if (dedupMedia.length > 0) {
      await supabaseAdmin.from("import_media").delete().eq("job_id", jobId);
      for (let i = 0; i < dedupMedia.length; i += 50) await supabaseAdmin.from("import_media").insert(dedupMedia.slice(i, i + 50));
    }

    // 7. Build manual_todo (what the admin must finish by hand)
    const REQUIRED = [
      { key: "name_en", label: "Project name" },
      { key: "developer_en", label: "Developer" },
      { key: "overview_en", label: "Description / overview" },
      { key: "unit_types", label: "Unit types" },
      { key: "size_range", label: "Size (SQF)" },
      { key: "type", label: "Status (off-plan / ready)" },
      { key: "price_range", label: "Price range (from – to)" },
    ];
    const missingFields = REQUIRED.filter((r) => { const v = safeUpdate[r.key]; return v === undefined || v === null || v === "" || v === "TBA"; }).map((r) => r.label);
    const imagesNeeded = Math.max(0, MIN_IMAGES - imageCount);
    const manualTodo = {
      fields: missingFields,
      images_found: imageCount,
      images_needed: imagesNeeded,
      warnings,
    };

    safeUpdate.import_status = "reviewing";
    safeUpdate.image_count = imageCount;
    safeUpdate.video_count = videoCount;
    safeUpdate.manual_todo = manualTodo;
    safeUpdate.ai_extraction_raw = { ...record, _payment_milestones: paymentMilestones, _amenities: amenitiesList, _ai_model: AI_MODEL, _source: "chat" };

    const { error: upErr } = await supabaseAdmin.from("import_jobs").update(safeUpdate).eq("id", jobId);
    if (upErr) throw new Error(`Failed to save draft: ${upErr.message}`);

    await log(supabase, jobId, "chat_done", `Draft ready. Missing: ${missingFields.length}. Images: ${imageCount}/${MIN_IMAGES}.`, missingFields.length || imagesNeeded ? "warning" : "success");

    // 8. Compose a friendly assistant summary
    const name = (safeUpdate.name_en as string) || propertyHint || "this property";
    const lines: string[] = [];
    lines.push(`I've drafted **${name}**${safeUpdate.developer_en ? ` by ${safeUpdate.developer_en}` : ""}.`);
    if (safeUpdate.location_en) lines.push(`📍 ${safeUpdate.location_en}`);
    if (safeUpdate.price_range) lines.push(`💰 ${safeUpdate.price_range}`);
    if (safeUpdate.unit_types) lines.push(`🏠 Units: ${String(safeUpdate.unit_types).replace(/\|/g, ", ")}`);
    lines.push(`🖼️ ${imageCount} image(s) attached${imagesNeeded ? ` — please upload ${imagesNeeded} more to reach ${MIN_IMAGES}.` : "."}`);
    if (missingFields.length) lines.push(`⚠️ I couldn't extract: **${missingFields.join(", ")}**. Please add these in review or send me the info.`);
    else lines.push(`✅ All key fields extracted. Open it in the Review Queue to approve & publish.`);

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      assistant_message: lines.join("\n"),
      property: safeUpdate,
      manual_todo: manualTodo,
      image_count: imageCount,
      payment_milestones: paymentMilestones,
      amenities: amenitiesList,
      warnings,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("chat-extract error:", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
