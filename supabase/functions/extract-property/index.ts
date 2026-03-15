/**
 * AI Property Extraction Edge Function (Google Drive version)
 * Downloads PDFs/Docs from Google Drive and uses Lovable AI (Gemini) to extract
 * all property fields. Returns structured JSON.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  (rows || []).forEach((r: { key: string; value: string | null }) => { if (r.value) map[r.key] = r.value; });
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { job_id, folder_name, pdf_files } = await req.json();
    if (!job_id || !folder_name) {
      return new Response(JSON.stringify({ error: "Missing job_id or folder_name" }), { status: 400, headers: corsHeaders });
    }

    // Get Google Drive access token
    const accessToken = await getValidAccessToken(supabase);

    // Update job status to extracting
    await supabase.from("import_jobs").update({ import_status: "extracting" }).eq("id", job_id);

    let combinedPdfText = `Property folder: ${folder_name}\n\n`;

    // Download and extract text from PDFs/Docs (sorted by size descending, take up to 3)
    const sortedPdfs = [...(pdf_files || [])].sort((a: { size?: number }, b: { size?: number }) => (b.size || 0) - (a.size || 0)).slice(0, 3);

    if (accessToken && sortedPdfs.length > 0) {
      for (const pdf of sortedPdfs) {
        try {
          // Download file from Google Drive
          const fileId = pdf.id || pdf.path_lower; // support both drive file id and legacy dropbox path
          const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (dlRes.ok) {
            const buffer = await dlRes.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (LOVABLE_API_KEY) {
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
                          text: `Analyze this property brochure PDF for "${folder_name}" and extract the structured data.`,
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
                  const extracted = JSON.parse(cleaned);

                  const nameForSlug = (extracted.name_en || folder_name.split(" - ")[0] || folder_name);
                  const slug = nameForSlug.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

                  const finalData = { ...extracted, slug };
                  await supabase.from("import_jobs").update({
                    ...finalData,
                    ai_extraction_raw: extracted,
                    import_status: "reviewing",
                  }).eq("id", job_id);

                  await supabase.from("import_logs").insert({
                    job_id, action: "ai_extraction",
                    details: `Successfully extracted data from "${pdf.name}" using Lovable AI (Google Drive)`,
                    level: "success",
                  });

                  return new Response(JSON.stringify({ success: true, data: finalData }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
                } catch {
                  combinedPdfText += `AI response (unparsed): ${content.slice(0, 2000)}\n\n`;
                }
              }
            }
          }
        } catch (e) {
          console.error("PDF download error:", e);
        }
      }
    }

    // Fallback: text-only extraction from folder name
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: EXTRACTION_USER_PROMPT(folder_name, combinedPdfText) },
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: corsHeaders });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), { status: 402, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extracted: Record<string, unknown> = {};
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      extracted = { name_en: folder_name.split(" - ")[0], overview_en: content.slice(0, 500) };
    }

    const nameForSlug = ((extracted.name_en as string) || folder_name.split(" - ")[0] || folder_name);
    const slug = nameForSlug.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

    const finalData = { ...extracted, slug };

    await supabase.from("import_jobs").update({
      ...finalData,
      ai_extraction_raw: extracted,
      import_status: "reviewing",
    }).eq("id", job_id);

    await supabase.from("import_logs").insert({
      job_id, action: "ai_extraction",
      details: "Extracted data using Lovable AI (text mode, Google Drive)",
      level: sortedPdfs.length > 0 ? "warning" : "info",
    });

    return new Response(JSON.stringify({ success: true, data: finalData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-property error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
