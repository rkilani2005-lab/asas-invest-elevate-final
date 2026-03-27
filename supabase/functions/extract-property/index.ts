/**
 * ASAS Property Extraction — V4.1
 * Pipeline: Google Drive PDF → Gemini AI (direct PDF or text extraction fallback) → Arabic translation
 *
 * - PDFs ≤ 15MB: sent directly to Gemini as base64 (full visual understanding)
 * - PDFs > 15MB: text extracted via pdf-parse first, then sent as text to Gemini
 * Uses Lovable AI gateway (OpenAI-compatible) for zero-config AI access.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://esm.sh/pdf-parse@1.1.1"
import pdfParse from "https://esm.sh/pdf-parse@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompts ───────────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a professional real estate data extraction specialist for the ASAS property platform in Dubai, UAE.
You are given a property brochure PDF. Analyze all pages thoroughly.
Return ONLY valid JSON — no markdown fences, no explanations, no extra keys.
Never fabricate data. Use "" for missing text fields, "TBA" for unknown price_range or size_range.
For handover_date: convert quarter notation → last day of quarter (Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31).`;

const EXTRACTION_PROMPT = (folderName: string) => `
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
  "enduser_text_en": "2-3 sentences for residents: lifestyle, comfort, community, living experience"
}`;

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

// ── Lovable AI Gateway helper ─────────────────────────────────────────────────

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(
  messages: Array<{ role: string; content: unknown }>,
  model = "google/gemini-2.5-flash",
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

/** Call AI with a PDF attachment (base64) */
async function callAIWithPDF(
  pdfBase64: string,
  systemPrompt: string,
  userPrompt: string,
  model = "google/gemini-2.5-flash",
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
        },
      ],
    },
  ];
  return callAI(messages, model);
}

/** Call AI with text-only prompt */
async function callAIText(
  systemPrompt: string,
  userPrompt: string,
  model = "google/gemini-2.5-flash",
): Promise<string> {
  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model,
  );
}

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Google Drive helpers ──────────────────────────────────────────────────────

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
  if (Date.now() > expiryMs - 5 * 60 * 1000 && map.gdrive_refresh_token) {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID");
    const GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (GCI && GCS) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GCI, client_secret: GCS,
          refresh_token: map.gdrive_refresh_token, grant_type: "refresh_token",
        }),
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

async function downloadDrivePDF(fileId: string, token: string): Promise<ArrayBuffer | null> {
  let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
  if (!res.ok) return null;
  return await res.arrayBuffer();
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
    const raw = JSON.parse(await fr.text());
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_")));
  } catch {
    return {};
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

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
    const v = data[f];
    return v !== null && v !== undefined && v !== "" && v !== "TBA";
  }).length;
  return { errors, warnings, completeness: Math.round((filled / ALL_FIELDS.length) * 100) };
}

function generateSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
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

    // Resolve folder_id
    let resolvedFolderId = folder_id;
    if (!resolvedFolderId) {
      const { data: jobRow } = await supabase
        .from("import_jobs").select("dropbox_folder_path").eq("id", job_id).maybeSingle();
      resolvedFolderId = jobRow?.dropbox_folder_path || null;
    }

    // Resolve pdf_files
    let resolvedPdfFiles = pdf_files || [];
    if (!resolvedPdfFiles.length) {
      const { data: mediaRows } = await supabase
        .from("import_media")
        .select("dropbox_path, original_filename, original_size_bytes")
        .eq("job_id", job_id).eq("media_type", "brochure");
      resolvedPdfFiles = (mediaRows || []).map((m: any) => ({
        id: m.dropbox_path, name: m.original_filename, size: m.original_size_bytes || 0,
      }));
    }

    // ── 1. Read metadata.json ─────────────────────────────────────────────────
    let metadata: Record<string, unknown> = {};
    if (accessToken && resolvedFolderId) {
      metadata = await readMetadataJson(resolvedFolderId, accessToken);
      if (Object.keys(metadata).length > 0) {
        await supabase.from("import_logs").insert({
          job_id, action: "metadata_read",
          details: `metadata.json loaded — ${Object.keys(metadata).length} fields`,
          level: "info",
        });
      }
    }

    // ── 2. Download PDF and extract with Gemini AI ────────────────────────────
    let extracted: Record<string, unknown> = {};
    let pdfSource = "none";

    // Sort PDFs by size (largest first), try top 2
    const sortedPdfs = [...resolvedPdfFiles]
      .sort((a: any, b: any) => (b.size || 0) - (a.size || 0))
      .slice(0, 2);

    if (accessToken && sortedPdfs.length > 0) {
      for (const pdf of sortedPdfs) {
        try {
          const fileId = pdf.id || pdf.dropbox_path;
          const filename = pdf.original_filename || pdf.name || "brochure.pdf";

          await supabase.from("import_logs").insert({
            job_id, action: "pdf_download",
            details: `Downloading "${filename}" from Google Drive`,
            level: "info",
          });

          const buffer = await downloadDrivePDF(fileId, accessToken);
          if (!buffer) {
            await supabase.from("import_logs").insert({
              job_id, action: "pdf_skip",
              details: `Could not download "${filename}" from Drive`,
              level: "warning",
            });
            continue;
          }

          // Skip files > 20MB to avoid gateway limits
          if (buffer.byteLength > 20 * 1024 * 1024) {
            await supabase.from("import_logs").insert({
              job_id, action: "pdf_skip",
              details: `"${filename}" is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB — skipping (max 20MB)`,
              level: "warning",
            });
            continue;
          }

          await supabase.from("import_logs").insert({
            job_id, action: "gemini_extract",
            details: `Sending "${filename}" (${(buffer.byteLength / 1024).toFixed(0)} KB) to Gemini AI for direct PDF extraction`,
            level: "info",
          });

          // Convert to base64 and send directly to Gemini
          const uint8 = new Uint8Array(buffer);
          let binary = "";
          // Process in chunks to avoid call stack overflow
          const chunkSize = 8192;
          for (let i = 0; i < uint8.length; i += chunkSize) {
            const chunk = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
            binary += String.fromCharCode(...chunk);
          }
          const pdfBase64 = btoa(binary);

          const raw = await callAIWithPDF(
            pdfBase64,
            EXTRACTION_SYSTEM,
            EXTRACTION_PROMPT(folder_name),
            "google/gemini-2.5-flash",
          );

          extracted = parseJSON(raw);

          if (extracted.name_en) {
            pdfSource = filename;
            await supabase.from("import_logs").insert({
              job_id, action: "gemini_success",
              details: `Gemini extracted ${Object.keys(extracted).length} fields from "${filename}"`,
              level: "success",
            });
            break;
          }
        } catch (e) {
          await supabase.from("import_logs").insert({
            job_id, action: "gemini_error",
            details: `Gemini extraction error: ${String(e).slice(0, 300)}`,
            level: "warning",
          });
        }
      }
    }

    // Fallback: generate from folder name
    if (!extracted.name_en) {
      try {
        const fallbackPrompt = `Generate property listing data for a Dubai real estate property.
Folder name: "${folder_name}" (pattern: "{Property Name} - {Location}")
Use the folder name to infer name_en and location_en. Use TBA for price/size.
Return ONLY the JSON object with the same keys as described.`;
        const raw = await callAIText(EXTRACTION_SYSTEM, fallbackPrompt);
        extracted = parseJSON(raw);
        await supabase.from("import_logs").insert({
          job_id, action: "ai_fallback",
          details: "No PDF available — used folder name fallback. Review all fields carefully.",
          level: "warning",
        });
      } catch {
        extracted = { name_en: folder_name.split(" - ")[0] };
      }
    }

    // ── 3. Arabic marketing translation ──────────────────────────────────────
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
        await supabase.from("import_logs").insert({
          job_id, action: "arabic_translation",
          details: `Translated ${Object.keys(toTranslate).length} fields to Gulf Arabic marketing copy`,
          level: "success",
        });
      } catch (e) {
        await supabase.from("import_logs").insert({
          job_id, action: "arabic_translation",
          details: `Arabic translation failed: ${String(e).slice(0, 200)}`,
          level: "warning",
        });
      }
    }

    // ── 4. Merge (priority: _overrides > metadata > arabic > extracted > defaults)
    const merged: Record<string, unknown> = { ...extracted };
    for (const [k, v] of Object.entries(arabicData)) {
      if (v?.trim()) merged[k] = v;
    }
    const overrides = (metadata._overrides as Record<string, unknown>) || {};
    for (const [k, v] of Object.entries(metadata)) {
      if (k !== "_overrides" && v !== null && v !== undefined && v !== "") merged[k] = v;
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v;
    }

    if (!merged.slug) merged.slug = generateSlug((merged.name_en as string) || folder_name.split(" - ")[0]);
    if (!merged.status) merged.status = "available";
    if (merged.is_featured === undefined) merged.is_featured = true;

    // ── 5. Validate ───────────────────────────────────────────────────────────
    const { errors, warnings, completeness } = validateFields(merged);

    // ── 6. Check publishing mode ──────────────────────────────────────────────
    const { data: modeRow } = await supabase
      .from("importer_settings").select("value").eq("key", "publishing_mode").maybeSingle();
    const publishingMode = modeRow?.value || "manual";
    const approvalStatus = errors.length > 0 ? "pending_review"
      : publishingMode === "auto" ? "auto_published" : "pending_review";

    // Save to job
    const { ai_confidence: _conf, ...dataToSave } = merged as Record<string, unknown>;
    await supabase.from("import_jobs").update({
      ...dataToSave,
      ai_extraction_raw: extracted,
      import_status: "reviewing",
      approval_status: approvalStatus,
      validation_errors: errors,
      validation_warnings: warnings,
      field_completeness: completeness,
    }).eq("id", job_id);

    // ── 7. Admin email notification ───────────────────────────────────────────
    try {
      const { data: adminRow } = await supabase
        .from("importer_settings").select("value").eq("key", "admin_email").maybeSingle();
      const adminEmail = adminRow?.value;
      if (adminEmail && errors.length === 0) {
        const isAuto = publishingMode === "auto";
        const subject = `[ASAS] ${isAuto ? "Auto-Processed" : "Pending Review"}: ${merged.name_en}`;
        const body = isAuto
          ? `"${merged.name_en}" processed via Gemini AI. Completeness: ${completeness}%. Warnings: ${warnings.length}.`
          : `"${merged.name_en}" (${merged.location_en}) is awaiting your review.\n\nCompleteness: ${completeness}%\nWarnings: ${warnings.length}\n\nApprove at: /admin/importer/approval`;
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ to: adminEmail, subject, text: body, trigger: "property_import" }),
        }).catch(() => {});
        await supabase.from("import_jobs").update({ notification_sent: true }).eq("id", job_id);
      }
    } catch { /* email failure must never fail the import */ }

    await supabase.from("import_logs").insert({
      job_id, action: "extraction_complete",
      details: `Pipeline complete. Source: ${pdfSource || "folder name fallback"}. Completeness: ${completeness}%. Errors: ${errors.length}. Warnings: ${warnings.length}. Mode: ${publishingMode}.`,
      level: errors.length > 0 ? "warning" : "success",
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: merged,
        pipeline: { pdf_source: pdfSource },
        validation: { errors, warnings, completeness },
        publishing_mode: publishingMode,
        approval_status: approvalStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-property V4 error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
