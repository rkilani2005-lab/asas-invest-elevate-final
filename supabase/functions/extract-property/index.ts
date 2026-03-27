/**
 * ASAS Property Extraction — V3
 * Pipeline: Google Drive PDF → Docling Serve (Markdown) → Claude API (26 fields) → Claude API (Arabic)
 *
 * Docling converts the PDF into clean structured Markdown (tables, columns, bullet points preserved).
 * Claude then extracts fields from clean text — far more accurate than pixel-reading the PDF.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompts ───────────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a professional real estate data extraction specialist for the ASAS property platform in Dubai, UAE.
You are given clean Markdown text extracted from a property brochure.
Return ONLY valid JSON — no markdown fences, no explanations, no extra keys.
Never fabricate data. Use "" for missing text fields, "TBA" for unknown price_range or size_range.
For handover_date: convert quarter notation → last day of quarter (Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31).`;

const EXTRACTION_PROMPT = (folderName: string, markdown: string) => `
Extract property listing data from this brochure Markdown for: "${folderName}"

Brochure content:
---
${markdown.slice(0, 18000)}
---

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
  "ai_confidence": {
    "name_en": "high|medium|low",
    "developer_en": "high|medium|low",
    "price_range": "high|medium|low",
    "handover_date": "high|medium|low",
    "type": "high|medium|low",
    "unit_types": "high|medium|low"
  }
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

// ── Claude API helper ─────────────────────────────────────────────────────────

async function callClaude(
  userContent: string,
  systemPrompt: string,
  apiKey: string,
  maxTokens = 3000
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content?.[0]?.text || "").trim();
}

function parseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Google Drive token refresh ────────────────────────────────────────────────

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
          client_id: GCI,
          client_secret: GCS,
          refresh_token: map.gdrive_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (r.ok) {
        const t = await r.json();
        const newExpiry = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
        await (supabase.from("importer_settings") as any).upsert(
          [
            { key: "gdrive_access_token", value: t.access_token },
            { key: "gdrive_token_expiry", value: newExpiry },
          ],
          { onConflict: "key" }
        );
        return t.access_token;
      }
    }
  }
  return map.gdrive_access_token;
}

// ── Download PDF from Google Drive ───────────────────────────────────────────

async function downloadDrivePDF(fileId: string, token: string): Promise<ArrayBuffer | null> {
  // Try direct download (works for uploaded PDFs)
  let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Fallback: export Google Docs as PDF
  if (!res.ok) {
    res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  if (!res.ok) return null;
  return await res.arrayBuffer();
}

// ── Docling PDF → Markdown ────────────────────────────────────────────────────

// ── Get Google Cloud Run identity token ──────────────────────────────────────
// Uses the stored OAuth refresh token to obtain an identity token scoped
// to the Docling Cloud Run service URL. No service account key needed.

// ── Get Google Cloud Run identity token via Service Account impersonation ─────
// Flow: user refresh token → user access token → impersonate compute SA
//       → generate identity token scoped to Docling URL → call Docling
//
// Requires these IAM bindings (set up in Cloud Shell):
//   1. Compute SA has roles/run.invoker on the Docling Cloud Run service
//   2. Connected Google user has roles/iam.serviceAccountTokenCreator on compute SA

async function getCloudRunIdentityToken(
  supabase: ReturnType<typeof createClient>,
  audience: string
): Promise<string | null> {
  try {
    const GCI = Deno.env.get("GOOGLE_CLIENT_ID");
    const GCS = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SA_EMAIL = Deno.env.get("DOCLING_SA_EMAIL"); // e.g. 123456-compute@developer.gserviceaccount.com

    if (!GCI || !GCS || !SA_EMAIL) {
      console.warn("getCloudRunIdentityToken: missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or DOCLING_SA_EMAIL");
      return null;
    }

    // Step 1: Exchange stored refresh token → user access token
    const { data: rows } = await supabase
      .from("importer_settings")
      .select("key, value")
      .eq("key", "gdrive_refresh_token");

    const refreshToken = (rows || []).find(
      (r: { key: string; value: string | null }) => r.key === "gdrive_refresh_token"
    )?.value;

    if (!refreshToken) {
      console.warn("getCloudRunIdentityToken: gdrive_refresh_token not found in importer_settings");
      return null;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GCI,
        client_secret: GCS,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.warn("getCloudRunIdentityToken: token refresh failed:", err.slice(0, 200));
      return null;
    }

    const { access_token: userAccessToken } = await tokenRes.json();
    if (!userAccessToken) return null;

    // Step 2: Impersonate the compute SA to mint a Cloud Run identity token
    // The user account must have roles/iam.serviceAccountTokenCreator on SA_EMAIL
    // The SA_EMAIL must have roles/run.invoker on the Docling Cloud Run service
    const idTokenRes = await fetch(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA_EMAIL}:generateIdToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audience,       // Cloud Run URL — must match exactly
          includeEmail: true,
        }),
      }
    );

    if (!idTokenRes.ok) {
      const err = await idTokenRes.text();
      console.warn("getCloudRunIdentityToken: generateIdToken failed:", err.slice(0, 300));
      return null;
    }

    const { token } = await idTokenRes.json();
    return token || null;

  } catch (e) {
    console.error("getCloudRunIdentityToken error:", e);
    return null;
  }
}

async function convertPDFWithDocling(
  pdfBuffer: ArrayBuffer,
  filename: string,
  doclingUrl: string,
  identityToken: string | null
): Promise<string | null> {
  try {
    // Build multipart form — send PDF file to docling-serve
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    formData.append("files", blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);

    // Build headers — include identity token if available (required for authenticated Cloud Run)
    const headers: Record<string, string> = {};
    if (identityToken) {
      headers["Authorization"] = `Bearer ${identityToken}`;
    }

    // docling-serve v1 API: POST /v1/convert/file
    const res = await fetch(`${doclingUrl}/v1/convert/file`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Docling API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();

    // docling-serve returns: { document: { md_content: "..." } }
    // or for batch: { documents: [{ md_content: "..." }] }
    const mdContent =
      data?.document?.md_content ||
      data?.documents?.[0]?.md_content ||
      data?.md_content ||
      null;

    return mdContent;
  } catch (e) {
    console.error("Docling conversion error:", e);
    return null;
  }
}

// ── Read metadata.json from Drive folder ─────────────────────────────────────

async function readMetadataJson(
  folderId: string,
  token: string
): Promise<Record<string, unknown>> {
  try {
    const lr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name='metadata.json'+and+trashed=false&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!lr.ok) return {};
    const { files } = await lr.json();
    if (!files?.length) return {};

    const fr = await fetch(
      `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!fr.ok) return {};
    const raw = JSON.parse(await fr.text());
    // Strip comment keys (prefixed with _)
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_")));
  } catch {
    return {};
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateFields(data: Record<string, unknown>): {
  errors: string[];
  warnings: string[];
  completeness: number;
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
    warnings.push("price_range not found in brochure — update in metadata.json");
  if (!data.handover_date)
    warnings.push("handover_date not found — update in metadata.json if known");
  if (!data.video_url)
    warnings.push("No video URL — add YouTube/Vimeo link to metadata.json if available");

  const filled = ALL_FIELDS.filter((f) => {
    const v = data[f];
    return v !== null && v !== undefined && v !== "" && v !== "TBA";
  }).length;

  return { errors, warnings, completeness: Math.round((filled / ALL_FIELDS.length) * 100) };
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const DOCLING_SERVE_URL = Deno.env.get("DOCLING_SERVE_URL");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }
    if (!DOCLING_SERVE_URL) {
      return new Response(JSON.stringify({ error: "DOCLING_SERVE_URL not configured — deploy docling-serve to Cloud Run first" }), { status: 500, headers: corsHeaders });
    }

    const { job_id, folder_name, folder_id, pdf_files } = await req.json();
    if (!job_id || !folder_name) {
      return new Response(JSON.stringify({ error: "Missing job_id or folder_name" }), { status: 400, headers: corsHeaders });
    }

    await supabase.from("import_jobs").update({ import_status: "extracting" }).eq("id", job_id);

    const accessToken = await getValidAccessToken(supabase);

    // Resolve folder_id: use passed value or fall back to dropbox_folder_path on the job
    let resolvedFolderId = folder_id;
    if (!resolvedFolderId) {
      const { data: jobRow } = await supabase
        .from("import_jobs")
        .select("dropbox_folder_path")
        .eq("id", job_id)
        .maybeSingle();
      resolvedFolderId = jobRow?.dropbox_folder_path || null;
    }

    // Resolve pdf_files: use passed value or load from import_media table
    let resolvedPdfFiles = pdf_files || [];
    if (!resolvedPdfFiles.length) {
      const { data: mediaRows } = await supabase
        .from("import_media")
        .select("dropbox_path, original_filename, original_size_bytes")
        .eq("job_id", job_id)
        .eq("media_type", "brochure");
      resolvedPdfFiles = (mediaRows || []).map((m: { dropbox_path: string; original_filename: string; original_size_bytes: number }) => ({
        id: m.dropbox_path,
        name: m.original_filename,
        size: m.original_size_bytes || 0,
      }));
      if (resolvedPdfFiles.length) {
        await supabase.from("import_logs").insert({
          job_id, action: "pdf_resolve",
          details: `Loaded ${resolvedPdfFiles.length} PDF(s) from import_media table`,
          level: "info",
        });
      }
    }

    // ── 1. Read metadata.json ─────────────────────────────────────────────────
    let metadata: Record<string, unknown> = {};
    if (accessToken && resolvedFolderId) {
      metadata = await readMetadataJson(resolvedFolderId, accessToken);
      if (Object.keys(metadata).length > 0) {
        await supabase.from("import_jobs").update({ metadata_json: metadata }).eq("id", job_id);
        await supabase.from("import_logs").insert({
          job_id, action: "metadata_read",
          details: `metadata.json loaded — ${Object.keys(metadata).length} fields`,
          level: "info",
        });
      }
    }

    // ── 2. Download PDF and convert with Docling ──────────────────────────────
    let markdown = "";
    let pdfSource = "none";

    // Get Cloud Run identity token once — reused for all PDF calls
    const identityToken = await getCloudRunIdentityToken(supabase, DOCLING_SERVE_URL);

    await supabase.from("import_logs").insert({
      job_id, action: "docling_auth",
      details: identityToken
        ? `Cloud Run identity token obtained via SA impersonation (${Deno.env.get("DOCLING_SA_EMAIL") || "SA"})`
        : "Identity token unavailable — check DOCLING_SA_EMAIL secret and IAM bindings in Cloud Shell",
      level: identityToken ? "info" : "warning",
    });

    const sortedPdfs = [...(resolvedPdfFiles)]
      .sort((a: { size?: number }, b: { size?: number }) => (b.size || 0) - (a.size || 0))
      .slice(0, 2); // Try top 2 PDFs (largest first)

    if (accessToken && sortedPdfs.length > 0) {
      for (const pdf of sortedPdfs) {
        try {
          const fileId = pdf.id || pdf.dropbox_path;
          const filename = pdf.original_filename || pdf.name || "brochure.pdf";

          await supabase.from("import_logs").insert({
            job_id, action: "docling_start",
            details: `Downloading "${filename}" from Google Drive for Docling conversion`,
            level: "info",
          });

          const buffer = await downloadDrivePDF(fileId, accessToken);
          if (!buffer) {
            await supabase.from("import_logs").insert({
              job_id, action: "docling_skip",
              details: `Could not download "${filename}" from Drive`,
              level: "warning",
            });
            continue;
          }

          await supabase.from("import_logs").insert({
            job_id, action: "docling_convert",
            details: `Sending "${filename}" (${(buffer.byteLength / 1024).toFixed(0)} KB) to Docling for Markdown conversion`,
            level: "info",
          });

          markdown = (await convertPDFWithDocling(buffer, filename, DOCLING_SERVE_URL, identityToken)) || "";

          if (markdown && markdown.length > 100) {
            pdfSource = filename;
            await supabase.from("import_logs").insert({
              job_id, action: "docling_success",
              details: `Docling converted "${filename}" → ${markdown.length.toLocaleString()} chars of clean Markdown`,
              level: "success",
            });
            break; // Success — no need to try next PDF
          } else {
            await supabase.from("import_logs").insert({
              job_id, action: "docling_empty",
              details: `Docling returned empty/short content for "${filename}" — trying next PDF`,
              level: "warning",
            });
          }
        } catch (e) {
          await supabase.from("import_logs").insert({
            job_id, action: "docling_error",
            details: `Docling error: ${String(e).slice(0, 300)}`,
            level: "warning",
          });
        }
      }
    }

    // ── 3. Extract 26 fields with Claude ─────────────────────────────────────
    let extracted: Record<string, unknown> = {};

    if (markdown && markdown.length > 100) {
      // Primary path: Claude extracts from clean Docling Markdown
      try {
        const raw = await callClaude(
          EXTRACTION_PROMPT(folder_name, markdown),
          EXTRACTION_SYSTEM,
          ANTHROPIC_API_KEY,
          3000
        );
        extracted = parseJSON(raw);
        await supabase.from("import_logs").insert({
          job_id, action: "ai_extraction",
          details: `Claude extracted ${Object.keys(extracted).length} fields from Docling Markdown of "${pdfSource}"`,
          level: "success",
        });
      } catch (e) {
        await supabase.from("import_logs").insert({
          job_id, action: "ai_extraction",
          details: `Claude extraction failed: ${String(e).slice(0, 300)}`,
          level: "warning",
        });
      }
    }

    if (!extracted.name_en) {
      // Fallback: Claude generates from folder name alone
      try {
        const fallbackPrompt = `Generate property listing data for a Dubai real estate property.
Folder name: "${folder_name}" (pattern: "{Property Name} - {Location}")
Use the folder name to infer name_en and location_en. Use TBA for price/size. Return the same JSON structure.`;
        const raw = await callClaude(fallbackPrompt, EXTRACTION_SYSTEM, ANTHROPIC_API_KEY, 2000);
        extracted = parseJSON(raw);
        await supabase.from("import_logs").insert({
          job_id, action: "ai_extraction",
          details: "No PDF available — used folder name fallback. Review all fields carefully.",
          level: "warning",
        });
      } catch {
        extracted = { name_en: folder_name.split(" - ")[0] };
      }
    }

    // ── 4. Arabic marketing translation ──────────────────────────────────────
    // Only translate fields not already provided in metadata.json
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
        const raw = await callClaude(ARABIC_PROMPT(toTranslate), ARABIC_SYSTEM, ANTHROPIC_API_KEY, 2000);
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

    // ── 5. Merge (priority: _overrides > metadata > arabic > extracted > defaults) ──
    const merged: Record<string, unknown> = { ...extracted };

    // Apply Arabic translations
    for (const [k, v] of Object.entries(arabicData)) {
      if (v?.trim()) merged[k] = v;
    }

    // Apply metadata.json fields
    const overrides = (metadata._overrides as Record<string, unknown>) || {};
    for (const [k, v] of Object.entries(metadata)) {
      if (k !== "_overrides" && v !== null && v !== undefined && v !== "") merged[k] = v;
    }

    // Apply _overrides (highest priority — explicit admin corrections)
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v;
    }

    // Defaults
    if (!merged.slug) {
      merged.slug = generateSlug((merged.name_en as string) || folder_name.split(" - ")[0]);
    }
    if (!merged.status) merged.status = "available";
    if (merged.is_featured === undefined) merged.is_featured = true;

    // ── 6. Validate ───────────────────────────────────────────────────────────
    const { errors, warnings, completeness } = validateFields(merged);

    // ── 7. Check publishing mode ──────────────────────────────────────────────
    const { data: modeRow } = await supabase
      .from("importer_settings")
      .select("value")
      .eq("key", "publishing_mode")
      .maybeSingle();
    const publishingMode = modeRow?.value || "manual";
    const approvalStatus = errors.length > 0 ? "pending_review"
      : publishingMode === "auto" ? "auto_published"
      : "pending_review";

    // Save everything to job
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

    // ── 8. Admin email notification (non-blocking) ────────────────────────────
    try {
      const { data: adminRow } = await supabase
        .from("importer_settings")
        .select("value")
        .eq("key", "admin_email")
        .maybeSingle();
      const adminEmail = adminRow?.value;

      if (adminEmail && errors.length === 0) {
        const isAuto = publishingMode === "auto";
        const subject = `[ASAS] ${isAuto ? "Auto-Processed" : "Pending Review"}: ${merged.name_en}`;
        const body = isAuto
          ? `"${merged.name_en}" processed via Docling+Claude. Completeness: ${completeness}%. Warnings: ${warnings.length}.`
          : `"${merged.name_en}" (${merged.location_en}) is awaiting your review.\n\nCompleteness: ${completeness}%\nWarnings: ${warnings.length}\n\nApprove at: /admin/importer/approval\n\nThis property will NOT go live until you approve it.`;

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
        pipeline: { pdf_source: pdfSource, markdown_chars: markdown.length },
        validation: { errors, warnings, completeness },
        publishing_mode: publishingMode,
        approval_status: approvalStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("extract-property V3 error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
