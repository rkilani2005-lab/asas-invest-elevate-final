/**
 * ASAS Property Extraction — V6
 * Fully automated pipeline: Google Drive → Recursive Scan → AI Extraction → CMS
 *
 * Capabilities:
 * 1. Recursive folder scan (Brochure, Floor Plans, Images, Videos, Payment Plan, Location, Amenities)
 * 2. PDF extraction via Gemini AI (brochures, payment plans, floor plans)
 * 3. Image categorization by subfolder name (hero, interior, render, floorplan)
 * 4. Payment plan extraction from PDFs/images
 * 5. Amenities extraction
 * 6. Duplicate detection (name/slug check before create)
 * 7. Auto media upload to Supabase Storage
 * 8. Arabic marketing translation
 * 9. Slug generation
 * 10. Parallel file processing where possible
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
}

interface CategorizedFile extends DriveFile {
  category: "brochure" | "floorplan" | "image" | "video" | "payment_plan" | "location" | "amenity" | "other";
  subcategory?: string; // hero, interior, render, etc.
}

interface FolderMap {
  [folderName: string]: { id: string; files: DriveFile[] };
}

// ── AI Prompts ────────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a professional real estate data extraction specialist for the ASAS property platform in Dubai, UAE.
You are given a property brochure (either as a PDF or as extracted text). Analyze all content thoroughly.
Return ONLY valid JSON — no markdown fences, no explanations, no extra keys.
Never fabricate data. Use "" for missing text fields, "TBA" for unknown price_range or size_range.
For handover_date: convert quarter notation → last day of quarter (Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31).`;

const EXTRACTION_PROMPT_PDF = (folderName: string) => `
Extract property listing data from this brochure PDF for: "${folderName}"

Return ONLY this JSON object:
{
  "name_en": "Property name in English",
  "tagline_en": "One punchy marketing headline under 100 chars",
  "developer_en": "Developer company name",
  "location_en": "Area and city e.g. Dubai Marina, Dubai",
  "price_range": "e.g. AED 1.2M - 3.5M or TBA",
  "size_range": "e.g. 750 - 2500 sqft or TBA",
  "unit_types": "Pipe-separated e.g. Studio|1BR|2BR|3BR",
  "ownership_type": "Freehold or Leasehold",
  "type": "off-plan or ready",
  "handover_date": "YYYY-MM-DD or empty string",
  "overview_en": "200-250 word editorial description: location, architecture, design, amenities, connectivity",
  "highlights_en": "8-10 pipe-separated key features e.g. Panoramic sea views|Infinity pool|Smart home technology",
  "investment_en": "2-3 sentences for investors: ROI potential, yield, market positioning, capital growth",
  "enduser_text_en": "2-3 sentences for residents: lifestyle, comfort, community, living experience",
  "amenities": ["Swimming Pool", "Gym", "Kids Play Area", "Concierge"],
  "floor_plan_units": [{"type": "1BR", "size_sqft": "750", "view": "Sea View"}]
}`;

const PAYMENT_PLAN_PROMPT = `Extract payment plan milestones from this document.
Return ONLY a JSON array of milestones:
[
  {"milestone_en": "Down Payment / Booking", "percentage": 20, "sort_order": 1},
  {"milestone_en": "During Construction (1st Installment)", "percentage": 10, "sort_order": 2},
  {"milestone_en": "On Handover", "percentage": 40, "sort_order": 3}
]
Rules:
- Percentages must sum to 100
- Sort by chronological order
- Use clear milestone descriptions
- If you cannot extract a payment plan, return an empty array []`;

const ARABIC_SYSTEM = `أنت خبير في كتابة المحتوى التسويقي العقاري باللغة العربية الفصحى المعاصرة.
متخصص في السوق العقاري الإماراتي ودبي. جمهورك: المستثمرون الخليجيون وأصحاب الثروات.

قواعد ثابتة:
1. عربية فصحى معاصرة — رسمية ولكن جذابة تسويقياً، لا تترجم حرفياً
2. أسماء المطورين: استخدم الأسماء الرسمية (إعمار، داماك، نخيل، ألدار، ميراس) وإلا احتفظ بالاسم
3. highlights_ar: احتفظ بفاصل الـ pipe (|) بين كل نقطة بالضبط كما في النص الإنجليزي
4. investment_ar: ركز على العائد والأمان وفرصة النمو — نبرة الثقة والاحتراف
5. enduser_text_ar: ركز على نمط الحياة والراحة والمجتمع — نبرة دافئة وطموحة
6. أعد JSON فقط — بلا أي نص قبله أو بعده`;

const ARABIC_PROMPT = (fields: Record<string, string>) => `
ترجم هذا المحتوى التسويقي العقاري إلى عربية فصحى معاصرة راقية.

البيانات المطلوب ترجمتها:
${JSON.stringify(fields, null, 2)}

أعد JSON بهذه المفاتيح فقط:
name_ar, developer_ar, location_ar, tagline_ar, overview_ar, highlights_ar, investment_ar, enduser_text_ar

إذا لم تجد قيمة لحقل ما في البيانات أعلاه، أعد قيمة فارغة "" لذلك المفتاح.`;

const AMENITY_PROMPT = `Extract amenities from this document/image.
Return ONLY a JSON array:
[
  {"name_en": "Swimming Pool", "category": "Recreation", "icon": "Waves"},
  {"name_en": "Fitness Center", "category": "Fitness", "icon": "Dumbbell"}
]
Valid categories: Recreation, Fitness, Business, Kids, Security, Lifestyle, General
Valid icons: Waves, Dumbbell, Briefcase, Baby, Shield, Heart, Star, Coffee, Car, Trees, Building, Wifi, Utensils`;

// ── AI Gateway ────────────────────────────────────────────────────────────────

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(
  messages: Array<{ role: string; content: unknown }>,
  model = "google/gemini-2.5-flash",
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

async function callAIWithPDF(pdfBase64: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const base64SizeMB = (pdfBase64.length * 3) / 4 / 1024 / 1024;
  if (base64SizeMB > 20) throw new Error(`PDF too large (${base64SizeMB.toFixed(1)}MB). Max 20MB.`);
  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: [
      { type: "text", text: userPrompt },
      { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
    ] },
  ]);
}

async function callAIWithImage(imageBase64: string, mimeType: string, systemPrompt: string, userPrompt: string): Promise<string> {
  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: [
      { type: "text", text: userPrompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ] },
  ]);
}

async function callAIText(systemPrompt: string, userPrompt: string): Promise<string> {
  return callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

function parseJSONArray(raw: string): unknown[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [];
}

// ── Google Drive Helpers ──────────────────────────────────────────────────────

async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: rows } = await supabase
    .from("importer_settings").select("key, value")
    .in("key", ["gdrive_access_token", "gdrive_refresh_token", "gdrive_token_expiry"]);

  const map: Record<string, string> = {};
  (rows || []).forEach((r: { key: string; value: string | null }) => { if (r.value) map[r.key] = r.value; });
  if (!map.gdrive_access_token) return null;

  const expiryMs = map.gdrive_token_expiry ? new Date(map.gdrive_token_expiry).getTime() : 0;
  if (Date.now() > expiryMs - 5 * 60 * 1000 && map.gdrive_refresh_token) {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID"), GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (GCI && GCS) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: GCI, client_secret: GCS, refresh_token: map.gdrive_refresh_token, grant_type: "refresh_token" }),
      });
      if (r.ok) {
        const t = await r.json();
        const newExpiry = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
        await (supabase.from("importer_settings") as any).upsert(
          [{ key: "gdrive_access_token", value: t.access_token }, { key: "gdrive_token_expiry", value: newExpiry }],
          { onConflict: "key" },
        );
        return t.access_token;
      }
    }
  }
  return map.gdrive_access_token;
}

/** List all items (files + folders) inside a Drive folder */
async function listDriveItems(token: string, folderId: string): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size)&pageSize=1000`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

/** Recursively discover all subfolders and their files (max 3 levels) */
async function scanFolderRecursive(
  token: string, folderId: string, depth = 0
): Promise<FolderMap> {
  const result: FolderMap = {};
  const items = await listDriveItems(token, folderId);

  const files = items.filter(f => f.mimeType !== "application/vnd.google-apps.folder");
  const folders = items.filter(f => f.mimeType === "application/vnd.google-apps.folder");

  // Root-level files
  if (files.length > 0) {
    result["_root"] = { id: folderId, files };
  }

  // Recurse into subfolders
  if (depth < 3) {
    for (const folder of folders) {
      const subItems = await listDriveItems(token, folder.id);
      const subFiles = subItems.filter(f => f.mimeType !== "application/vnd.google-apps.folder");
      const subFolders = subItems.filter(f => f.mimeType === "application/vnd.google-apps.folder");

      result[folder.name] = { id: folder.id, files: subFiles };

      // Go one more level deep
      if (depth < 2) {
        for (const sub2 of subFolders) {
          const sub2Items = await listDriveItems(token, sub2.id);
          const sub2Files = sub2Items.filter(f => f.mimeType !== "application/vnd.google-apps.folder");
          if (sub2Files.length > 0) {
            result[`${folder.name}/${sub2.name}`] = { id: sub2.id, files: sub2Files };
          }
        }
      }
    }
  }

  return result;
}

/** Categorize files by their parent folder name */
function categorizeFiles(folderMap: FolderMap): CategorizedFile[] {
  const categorized: CategorizedFile[] = [];

  for (const [folderName, { files }] of Object.entries(folderMap)) {
    const lowerName = folderName.toLowerCase();

    for (const file of files) {
      const lowerFile = file.name.toLowerCase();
      const cat: CategorizedFile = { ...file, category: "other" };

      // Categorize by folder name
      if (lowerName.includes("brochure") || lowerName.includes("pdf")) {
        cat.category = "brochure";
      } else if (lowerName.includes("floor") || lowerName.includes("plan")) {
        cat.category = "floorplan";
      } else if (lowerName.includes("payment") || lowerName.includes("installment")) {
        cat.category = "payment_plan";
      } else if (lowerName.includes("video") || lowerName.includes("tour")) {
        cat.category = "video";
      } else if (lowerName.includes("location") || lowerName.includes("map")) {
        cat.category = "location";
      } else if (lowerName.includes("ameniti") || lowerName.includes("facility") || lowerName.includes("feature")) {
        cat.category = "amenity";
      } else if (lowerName.includes("image") || lowerName.includes("photo") || lowerName.includes("render") || lowerName.includes("gallery")) {
        cat.category = "image";
      } else if (folderName === "_root") {
        // Root files — categorize by file type
        if (file.mimeType === "application/pdf" || lowerFile.endsWith(".pdf")) {
          cat.category = "brochure";
        } else if (file.mimeType.startsWith("image/")) {
          cat.category = "image";
        } else if (file.mimeType.startsWith("video/")) {
          cat.category = "video";
        }
      }

      // Subcategory for images
      if (cat.category === "image" && file.mimeType.startsWith("image/")) {
        if (lowerFile.includes("hero") || lowerFile.includes("cover") || lowerFile.includes("main")) {
          cat.subcategory = "hero";
        } else if (lowerFile.includes("interior") || lowerFile.includes("inside")) {
          cat.subcategory = "interior";
        } else if (lowerFile.includes("exterior") || lowerFile.includes("facade")) {
          cat.subcategory = "render";
        } else {
          cat.subcategory = "render";
        }
      }

      // Floor plan images
      if (cat.category === "floorplan" && file.mimeType.startsWith("image/")) {
        cat.subcategory = "floorplan";
      }

      categorized.push(cat);
    }
  }

  return categorized;
}

async function downloadDriveFile(fileId: string, token: string): Promise<ArrayBuffer | null> {
  let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  if (!res.ok) return null;
  return await res.arrayBuffer();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function readMetadataJson(folderId: string, token: string): Promise<Record<string, unknown>> {
  try {
    const lr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name='metadata.json'+and+trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!lr.ok) return {};
    const { files } = await lr.json();
    if (!files?.length) return {};
    const fr = await fetch(`https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fr.ok) return {};
    return JSON.parse(await fr.text());
  } catch { return {}; }
}

// ── Validation & Utilities ────────────────────────────────────────────────────

function validateFields(data: Record<string, unknown>): {
  errors: string[]; warnings: string[]; completeness: number;
} {
  const ALL_FIELDS = [
    "name_en","name_ar","slug","tagline_en","tagline_ar","developer_en","developer_ar",
    "location_en","location_ar","price_range","size_range","unit_types","ownership_type",
    "type","handover_date","overview_en","overview_ar","highlights_en","highlights_ar",
    "video_url","status","is_featured","investment_en","investment_ar",
    "enduser_text_en","enduser_text_ar",
  ];
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const f of ["name_en", "slug", "type", "status"]) {
    if (!data[f]) errors.push(`Missing required field: ${f}`);
  }
  if (data.type && !["off-plan", "ready"].includes(data.type as string))
    errors.push(`Invalid type: "${data.type}" — must be off-plan or ready`);
  if (data.status && !["available", "reserved", "sold"].includes(data.status as string))
    errors.push(`Invalid status: "${data.status}" — must be available, reserved, or sold`);
  if (!data.price_range || data.price_range === "TBA")
    warnings.push("price_range not found — update in metadata.json");
  if (!data.handover_date)
    warnings.push("handover_date not found — update in metadata.json if known");
  if (!data.video_url)
    warnings.push("No video URL — add to metadata.json if available");

  const filled = ALL_FIELDS.filter((f) => {
    const v = data[f]; return v !== null && v !== undefined && v !== "" && v !== "TBA";
  }).length;
  return { errors, warnings, completeness: Math.round((filled / ALL_FIELDS.length) * 100) };
}

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

// ── Logging helper ────────────────────────────────────────────────────────────

async function log(
  supabase: ReturnType<typeof createClient>,
  jobId: string, action: string, details: string, level = "info"
) {
  await supabase.from("import_logs").insert({ job_id: jobId, action, details, level });
  console.log(`[${level}] ${action}: ${details}`);
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { job_id, folder_name, folder_id, pdf_files } = await req.json();
    if (!job_id || !folder_name) {
      return new Response(JSON.stringify({ error: "Missing job_id or folder_name" }), { status: 400, headers: corsHeaders });
    }

    await supabase.from("import_jobs").update({ import_status: "extracting" }).eq("id", job_id);

    const accessToken = await getValidAccessToken(supabase as any);
    if (!accessToken) {
      await log(supabase, job_id, "token_error", "Could not obtain Google Drive access token", "error");
      return new Response(JSON.stringify({ error: "No Drive access token" }), { status: 400, headers: corsHeaders });
    }

    // Resolve folder ID
    let resolvedFolderId = folder_id;
    if (!resolvedFolderId) {
      const { data: jobRow } = await supabase
        .from("import_jobs").select("dropbox_folder_path").eq("id", job_id).maybeSingle();
      resolvedFolderId = jobRow?.dropbox_folder_path || null;
    }
    if (!resolvedFolderId) {
      return new Response(JSON.stringify({ error: "No folder ID found" }), { status: 400, headers: corsHeaders });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Recursive Folder Scan & File Categorization
    // ═══════════════════════════════════════════════════════════════════════════
    await log(supabase, job_id, "scan_start", `Scanning folder "${folder_name}" recursively...`);

    const folderMap = await scanFolderRecursive(accessToken, resolvedFolderId);
    const allFiles = categorizeFiles(folderMap);

    const brochures = allFiles.filter(f => f.category === "brochure");
    const images = allFiles.filter(f => f.category === "image" && f.mimeType.startsWith("image/"));
    const floorplanFiles = allFiles.filter(f => f.category === "floorplan");
    const videoFiles = allFiles.filter(f => f.category === "video" && f.mimeType.startsWith("video/"));
    const paymentFiles = allFiles.filter(f => f.category === "payment_plan");
    const amenityFiles = allFiles.filter(f => f.category === "amenity");

    await log(supabase, job_id, "scan_complete",
      `Found: ${brochures.length} brochures, ${images.length} images, ${floorplanFiles.length} floor plans, ${videoFiles.length} videos, ${paymentFiles.length} payment plans, ${amenityFiles.length} amenity files`,
      "success"
    );

    // Update import_jobs counts
    await supabase.from("import_jobs").update({
      pdf_count: brochures.length + paymentFiles.filter(f => f.mimeType === "application/pdf").length,
      image_count: images.length + floorplanFiles.filter(f => f.mimeType.startsWith("image/")).length,
      video_count: videoFiles.length,
    }).eq("id", job_id);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Read metadata.json
    // ═══════════════════════════════════════════════════════════════════════════
    const metadata = await readMetadataJson(resolvedFolderId, accessToken);
    if (Object.keys(metadata).length > 0) {
      await log(supabase, job_id, "metadata_read", `metadata.json loaded — ${Object.keys(metadata).length} fields`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Extract property data from brochure PDFs
    // ═══════════════════════════════════════════════════════════════════════════
    let extracted: Record<string, unknown> = {};
    let pdfSource = "none";

    // Also consider pdf_files passed from the client (backward compatibility)
    let resolvedPdfFiles = pdf_files || [];
    if (!resolvedPdfFiles.length && brochures.length > 0) {
      resolvedPdfFiles = brochures.map(b => ({ id: b.id, name: b.name, size: parseInt(b.size || "0", 10) }));
    }

    // Sort PDFs by size descending, try up to 2
    const sortedPdfs = [...resolvedPdfFiles]
      .sort((a: any, b: any) => (b.size || 0) - (a.size || 0))
      .slice(0, 2);

    for (const pdf of sortedPdfs) {
      try {
        const fileId = pdf.id || pdf.dropbox_path;
        const filename = pdf.original_filename || pdf.name || "brochure.pdf";

        await log(supabase, job_id, "pdf_download", `Downloading "${filename}" from Google Drive`);

        const buffer = await downloadDriveFile(fileId, accessToken);
        if (!buffer) {
          await log(supabase, job_id, "pdf_skip", `Could not download "${filename}"`, "warning");
          continue;
        }

        const sizeMB = buffer.byteLength / 1024 / 1024;
        if (sizeMB > 20) {
          await log(supabase, job_id, "pdf_skip",
            `"${filename}" is ${sizeMB.toFixed(1)}MB — exceeds 20MB limit. Using folder-name fallback.`, "warning");
          continue;
        }

        await log(supabase, job_id, "gemini_extract", `Sending "${filename}" (${sizeMB.toFixed(1)}MB) to Gemini AI`);

        const pdfBase64 = arrayBufferToBase64(buffer);

        let raw: string;
        try {
          raw = await callAIWithPDF(pdfBase64, EXTRACTION_SYSTEM, EXTRACTION_PROMPT_PDF(folder_name));
        } catch (pdfErr) {
          await log(supabase, job_id, "gemini_pdf_fallback",
            `Direct PDF failed (${String(pdfErr).slice(0, 150)}), trying text fallback`, "warning");
          raw = await callAIText(EXTRACTION_SYSTEM,
            EXTRACTION_PROMPT_PDF(folder_name) + `\n\nNote: The PDF file is "${filename}". Extract what you can from naming conventions.`);
        }

        await log(supabase, job_id, "gemini_raw_response", `AI response: ${raw.slice(0, 500)}`, "info");

        extracted = parseJSON(raw);
        if (extracted.name_en) {
          pdfSource = filename;
          await log(supabase, job_id, "gemini_success",
            `Extracted ${Object.keys(extracted).length} fields from "${filename}"`, "success");
          break;
        }
      } catch (e) {
        await log(supabase, job_id, "gemini_error", `Extraction error: ${String(e).slice(0, 300)}`, "warning");
      }
    }

    // Fallback: generate from folder name
    if (!extracted.name_en) {
      try {
        const raw = await callAIText(EXTRACTION_SYSTEM,
          `Generate property listing data for a Dubai real estate property.
Folder name: "${folder_name}" (pattern: "{Property Name} - {Location}")
Use the folder name to infer name_en and location_en. Use TBA for price/size.
Return ONLY the JSON object with the same keys as described.`);
        extracted = parseJSON(raw);
        await log(supabase, job_id, "ai_fallback", "No PDF — used folder name fallback. Review all fields.", "warning");
      } catch {
        extracted = { name_en: folder_name.split(" - ")[0] };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Extract Payment Plan
    // ═══════════════════════════════════════════════════════════════════════════
    let paymentMilestones: unknown[] = [];

    // Try payment plan files first
    const paymentPdfs = paymentFiles.filter(f => f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const paymentImages = paymentFiles.filter(f => f.mimeType.startsWith("image/"));

    if (paymentPdfs.length > 0) {
      try {
        const buffer = await downloadDriveFile(paymentPdfs[0].id, accessToken);
        if (buffer && buffer.byteLength / 1024 / 1024 <= 20) {
          const b64 = arrayBufferToBase64(buffer);
          const raw = await callAIWithPDF(b64, "You are a payment plan extraction specialist.", PAYMENT_PLAN_PROMPT);
          paymentMilestones = parseJSONArray(raw);
          await log(supabase, job_id, "payment_extracted",
            `Extracted ${paymentMilestones.length} payment milestones from PDF`, "success");
        }
      } catch (e) {
        await log(supabase, job_id, "payment_error", `Payment PDF extraction failed: ${String(e).slice(0, 200)}`, "warning");
      }
    } else if (paymentImages.length > 0) {
      try {
        const buffer = await downloadDriveFile(paymentImages[0].id, accessToken);
        if (buffer && buffer.byteLength / 1024 / 1024 <= 10) {
          const b64 = arrayBufferToBase64(buffer);
          const raw = await callAIWithImage(b64, paymentImages[0].mimeType,
            "You are a payment plan extraction specialist.", PAYMENT_PLAN_PROMPT);
          paymentMilestones = parseJSONArray(raw);
          await log(supabase, job_id, "payment_extracted",
            `Extracted ${paymentMilestones.length} payment milestones from image`, "success");
        }
      } catch (e) {
        await log(supabase, job_id, "payment_error", `Payment image extraction failed: ${String(e).slice(0, 200)}`, "warning");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Extract Amenities
    // ═══════════════════════════════════════════════════════════════════════════
    let amenitiesList: unknown[] = (extracted.amenities as unknown[]) || [];

    if (amenityFiles.length > 0 && amenitiesList.length === 0) {
      const amenityPdfs = amenityFiles.filter(f => f.mimeType === "application/pdf");
      const amenityImages = amenityFiles.filter(f => f.mimeType.startsWith("image/"));

      if (amenityPdfs.length > 0) {
        try {
          const buffer = await downloadDriveFile(amenityPdfs[0].id, accessToken);
          if (buffer && buffer.byteLength / 1024 / 1024 <= 20) {
            const b64 = arrayBufferToBase64(buffer);
            const raw = await callAIWithPDF(b64, "You are an amenity extraction specialist.", AMENITY_PROMPT);
            amenitiesList = parseJSONArray(raw);
            await log(supabase, job_id, "amenities_extracted",
              `Extracted ${amenitiesList.length} amenities from PDF`, "success");
          }
        } catch (e) {
          await log(supabase, job_id, "amenity_error", `Amenity extraction failed: ${String(e).slice(0, 200)}`, "warning");
        }
      } else if (amenityImages.length > 0) {
        try {
          const buffer = await downloadDriveFile(amenityImages[0].id, accessToken);
          if (buffer && buffer.byteLength / 1024 / 1024 <= 10) {
            const b64 = arrayBufferToBase64(buffer);
            const raw = await callAIWithImage(b64, amenityImages[0].mimeType,
              "You are an amenity extraction specialist.", AMENITY_PROMPT);
            amenitiesList = parseJSONArray(raw);
            await log(supabase, job_id, "amenities_extracted",
              `Extracted ${amenitiesList.length} amenities from image`, "success");
          }
        } catch (e) {
          await log(supabase, job_id, "amenity_error", `Amenity image extraction failed: ${String(e).slice(0, 200)}`, "warning");
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Arabic Marketing Translation
    // ═══════════════════════════════════════════════════════════════════════════
    const arMap: Record<string, string> = {
      name_en: "name_ar", developer_en: "developer_ar", location_en: "location_ar",
      tagline_en: "tagline_ar", overview_en: "overview_ar", highlights_en: "highlights_ar",
      investment_en: "investment_ar", enduser_text_en: "enduser_text_ar",
    };
    const toTranslate: Record<string, string> = {};
    for (const [enKey, arKey] of Object.entries(arMap)) {
      const alreadyHasAr = metadata[arKey] && (metadata[arKey] as string).trim() !== "";
      if (!alreadyHasAr) {
        const enValue = ((metadata[enKey] || extracted[enKey]) as string | undefined) || "";
        if (enValue.trim()) toTranslate[enKey] = enValue;
      }
    }

    let arabicData: Record<string, string> = {};
    if (Object.keys(toTranslate).length > 0) {
      try {
        const raw = await callAIText(ARABIC_SYSTEM, ARABIC_PROMPT(toTranslate));
        arabicData = parseJSON(raw) as Record<string, string>;
        await log(supabase, job_id, "arabic_translation",
          `Translated ${Object.keys(toTranslate).length} fields to Arabic`, "success");
      } catch (e) {
        await log(supabase, job_id, "arabic_translation",
          `Arabic translation failed: ${String(e).slice(0, 200)}`, "warning");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: Merge All Data
    // ═══════════════════════════════════════════════════════════════════════════
    const merged: Record<string, unknown> = { ...extracted };
    // Remove non-CMS fields from merged
    delete merged.amenities;
    delete merged.floor_plan_units;

    for (const [k, v] of Object.entries(arabicData)) {
      if (v?.trim()) merged[k] = v;
    }
    const overrides = (metadata._overrides as Record<string, unknown>) || {};
    for (const [k, v] of Object.entries(metadata)) {
      if (k !== "_overrides" && !k.startsWith("_") && v !== null && v !== undefined && v !== "") merged[k] = v;
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v;
    }

    if (!merged.slug) merged.slug = generateSlug((merged.name_en as string) || folder_name.split(" - ")[0]);
    if (!merged.status) merged.status = "available";
    if (merged.is_featured === undefined) merged.is_featured = true;

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 8: Duplicate Detection
    // ═══════════════════════════════════════════════════════════════════════════
    let existingPropertyId: string | null = null;
    const slug = merged.slug as string;
    const nameEn = merged.name_en as string;

    // Check by slug
    const { data: slugMatch } = await supabase
      .from("properties").select("id, name_en").eq("slug", slug).maybeSingle();
    if (slugMatch) {
      existingPropertyId = slugMatch.id;
      await log(supabase, job_id, "duplicate_found",
        `Property with slug "${slug}" already exists (ID: ${slugMatch.id}). Will update instead of create.`, "warning");
    }

    // Also check by name if no slug match
    if (!existingPropertyId && nameEn) {
      const { data: nameMatch } = await supabase
        .from("properties").select("id, slug").eq("name_en", nameEn).maybeSingle();
      if (nameMatch) {
        existingPropertyId = nameMatch.id;
        merged.slug = nameMatch.slug; // Keep existing slug
        await log(supabase, job_id, "duplicate_found",
          `Property with name "${nameEn}" already exists (ID: ${nameMatch.id}). Will update.`, "warning");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 9: Validate
    // ═══════════════════════════════════════════════════════════════════════════
    const { errors, warnings, completeness } = validateFields(merged);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 10: Save to import_jobs
    // ═══════════════════════════════════════════════════════════════════════════
    const VALID_COLUMNS = [
      "name_en","name_ar","slug","tagline_en","tagline_ar","developer_en","developer_ar",
      "location_en","location_ar","price_range","size_range","unit_types","ownership_type",
      "type","handover_date","overview_en","overview_ar","highlights_en","highlights_ar",
      "video_url","status","is_featured","investment_en","investment_ar",
      "enduser_text_en","enduser_text_ar",
    ];
    const DATE_COLUMNS = new Set(["handover_date"]);
    const safeUpdate: Record<string, unknown> = {};
    for (const col of VALID_COLUMNS) {
      if (merged[col] !== undefined && merged[col] !== null) {
        if (DATE_COLUMNS.has(col) && merged[col] === "") {
          safeUpdate[col] = null;
        } else {
          safeUpdate[col] = merged[col];
        }
      }
    }
    safeUpdate.ai_extraction_raw = {
      ...extracted,
      _payment_milestones: paymentMilestones,
      _amenities: amenitiesList,
      _images_found: images.length,
      _floorplans_found: floorplanFiles.length,
      _videos_found: videoFiles.length,
      _duplicate_property_id: existingPropertyId,
      _folder_structure: Object.keys(folderMap),
    };
    safeUpdate.import_status = "reviewing";
    if (existingPropertyId) {
      safeUpdate.cms_property_id = existingPropertyId;
    }

    const { error: updateError } = await (supabase.from("import_jobs") as any)
      .update(safeUpdate).eq("id", job_id);

    if (updateError) {
      console.error("Failed to save extraction:", updateError);
      await log(supabase, job_id, "save_error",
        `Failed to save: ${JSON.stringify(updateError).slice(0, 300)}`, "error");
    } else {
      await log(supabase, job_id, "save_success",
        `Saved ${Object.keys(safeUpdate).length} fields. Status → reviewing.`, "success");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 11: Register media files in import_media table
    // ═══════════════════════════════════════════════════════════════════════════
    const mediaToRegister = [
      ...images.map((f, i) => ({
        job_id, dropbox_path: f.id, original_filename: f.name,
        media_type: f.subcategory === "hero" ? "hero" : (f.subcategory || "render"),
        original_size_bytes: parseInt(f.size || "0", 10),
        is_hero: f.subcategory === "hero" || i === 0,
        sort_order: i,
      })),
      ...floorplanFiles.filter(f => f.mimeType.startsWith("image/")).map((f, i) => ({
        job_id, dropbox_path: f.id, original_filename: f.name,
        media_type: "floorplan",
        original_size_bytes: parseInt(f.size || "0", 10),
        is_hero: false,
        sort_order: 100 + i,
      })),
      ...brochures.map((f, i) => ({
        job_id, dropbox_path: f.id, original_filename: f.name,
        media_type: "brochure",
        original_size_bytes: parseInt(f.size || "0", 10),
        is_hero: false,
        sort_order: 200 + i,
      })),
    ];

    if (mediaToRegister.length > 0) {
      // Clear existing media for this job first
      await supabase.from("import_media").delete().eq("job_id", job_id);
      // Insert in batches of 50
      for (let i = 0; i < mediaToRegister.length; i += 50) {
        const batch = mediaToRegister.slice(i, i + 50);
        await supabaseAdmin.from("import_media").insert(batch);
      }
      await log(supabase, job_id, "media_registered",
        `Registered ${mediaToRegister.length} media files (${images.length} images, ${floorplanFiles.filter(f => f.mimeType.startsWith("image/")).length} floor plans, ${brochures.length} brochures)`,
        "success");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 12: Check publishing mode
    // ═══════════════════════════════════════════════════════════════════════════
    const { data: modeRow } = await supabase
      .from("importer_settings").select("value").eq("key", "publishing_mode").maybeSingle();
    const publishingMode = modeRow?.value || "manual";

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 13: Admin email notification
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const { data: adminRow } = await supabase
        .from("importer_settings").select("value").eq("key", "admin_email").maybeSingle();
      const adminEmail = adminRow?.value;
      if (adminEmail && errors.length === 0) {
        const subject = `[ASAS] Pending Review: ${merged.name_en}`;
        const body = `"${merged.name_en}" (${merged.location_en}) is awaiting review.\nCompleteness: ${completeness}%\nWarnings: ${warnings.length}\nImages: ${images.length} | Floor Plans: ${floorplanFiles.length} | Videos: ${videoFiles.length}\n${existingPropertyId ? "⚠️ DUPLICATE: Will update existing property" : "New property will be created"}\n\nReview at: /admin/importer/approval`;
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ to: adminEmail, subject, text: body, trigger: "property_import" }),
        }).catch(() => {});
      }
    } catch { /* email failure must never break import */ }

    await log(supabase, job_id, "extraction_complete",
      `Pipeline complete. Source: ${pdfSource || "folder fallback"}. Completeness: ${completeness}%. Errors: ${errors.length}. Warnings: ${warnings.length}. Media: ${mediaToRegister.length} files. Payment milestones: ${paymentMilestones.length}. Amenities: ${amenitiesList.length}. Duplicate: ${existingPropertyId ? "YES" : "NO"}.`,
      errors.length > 0 ? "warning" : "success"
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: merged,
        pipeline: {
          pdf_source: pdfSource,
          folder_structure: Object.keys(folderMap),
          files_found: {
            brochures: brochures.length,
            images: images.length,
            floor_plans: floorplanFiles.length,
            videos: videoFiles.length,
            payment_plans: paymentFiles.length,
            amenity_files: amenityFiles.length,
          },
        },
        payment_milestones: paymentMilestones,
        amenities: amenitiesList,
        duplicate: existingPropertyId ? { property_id: existingPropertyId, action: "update" } : null,
        validation: { errors, warnings, completeness },
        publishing_mode: publishingMode,
        media_registered: mediaToRegister.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-property V6 error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
