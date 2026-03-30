/**
 * extract-chunk  —  Supabase Edge Function
 *
 * Receives a small batch of PDF page images (JPEG base64, max 4–6 pages) and
 * extracts structured property data using Claude claude-sonnet-4-20250514 Vision.
 *
 * WHY: The old extract-property function downloaded full 20–80 MB PDFs inside
 * the edge function and sent them to Gemini — causing consistent timeouts
 * (Supabase hard limit: 150 s). Each call of THIS function processes only
 * 4 pages in ~8–15 s — always within limits.
 *
 * Deploy:  supabase functions deploy extract-chunk
 * Secret:  ANTHROPIC_API_KEY  →  Supabase → Settings → Edge Functions → Secrets
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL      = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `
You are a property data extractor for ASAS Properties CMS (Dubai, UAE).
You receive JPEG images of document pages from a real estate brochure,
floor plan document, payment plan, or marketing material.

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
- NEVER invent data — use null / [] if a field is not visible on these pages
`.trim();

const cors = () => ({
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });

  try {
    const {
      pages          = [],
      sourceFile     = "unknown",
      batchIndex     = 0,
      totalBatches   = 1,
      folderCategory = "Brochure",
      hints          = "",
    } = await req.json();

    if (!Array.isArray(pages) || pages.length === 0)
      throw new Error("pages array is required and must not be empty");
    if (pages.length > 6)
      throw new Error(`Max 6 pages per batch, received ${pages.length}`);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret is not configured");

    const imageBlocks = pages.map((b64: string) => ({
      type:   "image",
      source: { type: "base64", media_type: "image/jpeg", data: b64 },
    }));

    const userText = [
      `Document: ${sourceFile}`,
      `Category: ${folderCategory}`,
      `Batch: ${batchIndex + 1} of ${totalBatches}`,
      hints ? `Context: ${hints}` : "",
      "Extract all property data visible in these pages.",
    ].filter(Boolean).join("\n");

    const res = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        messages: [{
          role:    "user",
          content: [...imageBlocks, { type: "text", text: userText }],
        }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API ${res.status}: ${body}`);
    }

    const raw  = (await res.json()).content?.[0]?.text ?? "";
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
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s !== -1 && e > s) try { return JSON.parse(text.slice(s, e + 1)); } catch {}
  console.warn("[extract-chunk] unparseable response — returning empty scaffold");
  return { _parse_failed: true, _raw: text.slice(0, 400) };
}
