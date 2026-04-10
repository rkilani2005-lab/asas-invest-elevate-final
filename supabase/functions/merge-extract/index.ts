/**
 * merge-extract  —  Supabase Edge Function
 *
 * Receives all partial extraction JSONs and merges them into one complete
 * import_jobs-compatible record using Lovable AI (Gemini).
 * Also generates Arabic translations and produces the final CMS-ready record.
 *
 * Requires secret: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud)
 */
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL   = "google/gemini-2.5-flash";
const MAX_TOKENS = 4096;

const MERGE_SYSTEM = `
You are merging multiple partial property data extractions into one final
record for ASAS Properties CMS. Partials come from text files and property
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
});

Deno.serve(async (req) => {
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const userMsg = [
      `Property folder: "${folder_name}"`,
      hints ? `Additional context: ${hints}` : "",
      `Media summary: ${image_count} image(s), ${video_count} video(s) in Google Drive folder`,
      video_files.length
        ? `Video files: ${JSON.stringify(video_files)}`
        : "",
      "",
      `Merge these ${partials.length} partial extraction(s) into one complete record.`,
      `Partials come from text files and property images (floor plans, exterior, interior).`,
      "",
      JSON.stringify(partials, null, 2),
    ].filter(Boolean).join("\n");

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:      AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: MERGE_SYSTEM },
          { role: "user", content: userMsg },
        ],
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
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e > s) try { return JSON.parse(t.slice(s, e + 1)); } catch {}
  throw new Error("Unparseable merge response: " + t.slice(0, 300));
}
