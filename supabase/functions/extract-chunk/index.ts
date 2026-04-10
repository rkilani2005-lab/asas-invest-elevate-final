/**
 * extract-chunk  —  Supabase Edge Function
 *
 * Receives a small batch of property data (text content or image base64)
 * and extracts structured property data using Lovable AI (Gemini).
 *
 * Requires secret: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud)
 */
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL   = "google/gemini-2.5-flash";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `
You are a property data extractor for ASAS Properties CMS (Dubai, UAE).
You receive text content or images from a real estate property folder.

Extract ALL visible data. Return ONLY valid JSON — no markdown fences,
no explanation, no preamble, no trailing text after the closing brace.

Use this exact schema (null for missing fields, [] for missing arrays):
{
  "name_en":         string | null,
  "tagline_en":      string | null,
  "developer_en":    string | null,
  "location_en":     string | null,
  "price_range":     string | null,
  "size_range":      string | null,
  "unit_types":      string | null,
  "ownership_type":  string | null,
  "type":            "off-plan" | "ready" | null,
  "handover_date":   string | null,
  "overview_en":     string | null,
  "highlights_en":   string | null,
  "investment_en":   string | null,
  "enduser_text_en": string | null,
  "amenities":       string[],
  "payment_plan":    { "milestone_en": string, "percentage": number, "sort_order": number }[],
  "floor_plan_units": { "type": string, "size_sqft": string, "view": string }[]
}

Rules:
- name_en: exact property name as printed (title case)
- tagline_en: punchy headline under 100 chars
- unit_types: pipe-separated e.g. "Studio|1BR|2BR|3BR"
- highlights_en: 6-10 pipe-separated bullet points
- handover_date: YYYY-MM-DD; Q1=03-31, Q2=06-30, Q3=09-30, Q4=12-31
- price_range: "AED 1.2M - 3.5M" format, or null if not shown
- NEVER invent data — use null / [] if a field is not visible
`.trim();

const cors = () => ({
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  try {
    const {
      pages          = [],
      sourceFile     = "unknown",
      batchIndex     = 0,
      totalBatches   = 1,
      folderCategory = "TextData",
      hints          = "",
    } = await req.json();

    if (!Array.isArray(pages) || pages.length === 0)
      throw new Error("pages array is required and must not be empty");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const userText = [
      `Document: ${sourceFile}`,
      `Category: ${folderCategory}`,
      `Batch: ${batchIndex + 1} of ${totalBatches}`,
      hints ? `Context: ${hints}` : "",
      "",
      "Extract all property data from the following content.",
      "",
      // For text batches, pages[0] contains the full text content
      // For image batches, pages contain base64 image data
      folderCategory === "TextData"
        ? pages.join("\n")
        : `[${pages.length} image(s) provided — analyze visually for property data]`,
    ].filter(Boolean).join("\n");

    // Build messages based on content type
    const messages: Array<{ role: string; content: unknown }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (folderCategory === "TextData") {
      // Text-only extraction
      messages.push({ role: "user", content: userText });
    } else {
      // Image-based extraction using multimodal
      const contentParts: unknown[] = [];
      for (const b64 of pages) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${b64}` },
        });
      }
      contentParts.push({ type: "text", text: userText });
      messages.push({ role: "user", content: contentParts });
    }

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:      AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI rate limit exceeded — retry shortly");
      if (res.status === 402) throw new Error("AI credits exhausted — add funds in workspace settings");
      throw new Error(`AI Gateway ${res.status}: ${body}`);
    }

    const raw  = (await res.json()).choices?.[0]?.message?.content ?? "";
    const data = safeJson(raw);
    data._meta = {
      source_file:     sourceFile,
      batch_index:     batchIndex,
      folder_category: folderCategory,
    };

    return new Response(JSON.stringify({ ok: true, data }), { headers: cors() });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-chunk]", msg);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: cors() }
    );
  }
});

function safeJson(text: string): Record<string, unknown> {
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e > s) try { return JSON.parse(t.slice(s, e + 1)); } catch {}
  console.warn("[extract-chunk] unparseable response — returning empty scaffold");
  return { _parse_failed: true, _raw: t.slice(0, 400) };
}
