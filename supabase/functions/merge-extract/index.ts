/**
 * merge-extract  —  Supabase Edge Function
 *
 * Receives all partial extraction JSONs (one per PDF or image batch) and merges
 * them into one complete import_jobs-compatible record using Claude.
 * Also generates Arabic translations, handles video metadata, and produces
 * the final CMS-ready property record.
 *
 * Deploy:  supabase functions deploy merge-extract
 * Secret:  ANTHROPIC_API_KEY  (same as extract-chunk)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL      = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

const MERGE_SYSTEM = `
You are merging multiple partial property data extractions into one final
record for ASAS Properties CMS. Partials come from PDF pages and property
images (exterior, interior, floor plans) of the same property in Dubai/UAE.

Merging rules:
1. Prefer non-null / non-empty values over null/empty.
2. For text fields: prefer the longest, most complete version.
3. For pipe-separated strings (unit_types, highlights_en): merge and deduplicate.
4. For amenities arrays: merge and deduplicate case-insensitively.
5. For payment_plan: merge by milestone_en (case-insensitive dedup), keep sort_order.
6. For floor_plan_units: merge by type (case-insensitive dedup).
7. Generate slug from name_en: lowercase, spaces to hyphens, remove special chars.
8. If type not found anywhere: default to "off-plan".
9. overview_en: write a polished 200-250 word editorial description combining all fragments.
10. For Arabic fields missing from partials (name_ar, tagline_ar, developer_ar,
    location_ar, overview_ar, highlights_ar, investment_ar, enduser_text_ar):
    translate from the English equivalent using formal Gulf Arabic (فصحى مبسطة).
11. For video_files: if any filename contains "youtube" or "youtu.be", extract as video_url.
    Otherwise note video count for reference.

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "name_en":         string,
  "name_ar":         string | null,
  "slug":            string,
  "tagline_en":      string | null,
  "tagline_ar":      string | null,
  "developer_en":    string | null,
  "developer_ar":    string | null,
  "location_en":     string | null,
  "location_ar":     string | null,
  "price_range":     string | null,
  "size_range":      string | null,
  "unit_types":      string | null,
  "ownership_type":  string | null,
  "type":            "off-plan" | "ready",
  "handover_date":   string | null,
  "overview_en":     string | null,
  "overview_ar":     string | null,
  "highlights_en":   string | null,
  "highlights_ar":   string | null,
  "investment_en":   string | null,
  "investment_ar":   string | null,
  "enduser_text_en": string | null,
  "enduser_text_ar": string | null,
  "amenities":       string[],
  "payment_plan":    { "milestone_en": string, "percentage": number, "sort_order": number }[],
  "floor_plan_units": { "type": string, "size_sqft": string, "view": string }[]
}
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
      partials     = [],
      hints        = "",
      folder_name  = "",
      video_files  = [],
      image_count  = 0,
      video_count  = 0,
    } = await req.json();

    if (!partials.length) throw new Error("partials array is empty — nothing to merge");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret is not configured");

    const userMsg = [
      `Property folder: "${folder_name}"`,
      hints ? `Additional context: ${hints}` : "",
      `Media summary: ${image_count} image(s), ${video_count} video(s) in Google Drive folder`,
      video_files.length
        ? `Video files: ${JSON.stringify(video_files)}`
        : "",
      "",
      `Merge these ${partials.length} partial extraction(s) into one complete record.`,
      `Partials come from both PDF pages and property images (floor plans, exterior, interior).`,
      "",
      JSON.stringify(partials, null, 2),
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
        system:     MERGE_SYSTEM,
        messages:   [{ role: "user", content: userMsg }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API ${res.status}: ${body}`);
    }

    const raw  = (await res.json()).content?.[0]?.text ?? "";
    const data = safeJson(raw);

    return new Response(JSON.stringify({ ok: true, data }), { headers: cors() });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[merge-extract]", msg);
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
  throw new Error("Unparseable merge response: " + text.slice(0, 300));
}
