/**
 * translate-content
 * -----------------
 * AI translation fallback for CMS fields. Called from the frontend
 * (via useAutoTranslatedField) whenever a localized text field is
 * missing — typically an Arabic property name/description that the
 * admin hasn't manually translated yet.
 *
 * Strategy:
 *   1. Look up the cache by (cache_key, target_locale).
 *   2. If found AND source_text matches the current source, return it.
 *   3. Otherwise call the Lovable AI Gateway (Gemini), upsert the
 *      result into translations_cache, and return it.
 *
 * Uses the same Lovable AI gateway as extract-property, so no extra
 * secrets to provision. Requires LOVABLE_API_KEY (auto-provisioned)
 * and SUPABASE_SERVICE_ROLE_KEY (auto-provisioned).
 *
 * verify_jwt = false (registered in config.toml) so the public site
 * can call it without an auth token.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

const MAX_INPUT_CHARS = 12_000; // generous for property descriptions; reject novels

interface TranslateRequest {
  text: string;
  source_locale?: string; // default 'en'
  target_locale: string; // typically 'ar'
  cache_key: string; // e.g. "property:<id>:name"
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPrompt(text: string, sourceLocale: string, targetLocale: string): string {
  // Brand-aware prompt for the Asas Invest tone of voice.
  if (targetLocale === "ar") {
    return [
      "You translate copy for ASAS Invest, a premium Dubai real estate firm.",
      "Translate the following text from " + (sourceLocale === "en" ? "English" : sourceLocale) +
        " into Modern Standard Arabic (فصحى مبسطة).",
      "Rules:",
      "- Preserve proper nouns (community names, developer names, brand names) exactly as written.",
      "- Preserve all numbers, prices, dates, and units (sqft, AED, etc.).",
      "- Match a sophisticated, trust-inspiring, understated luxury tone — never salesy.",
      "- Output ONLY the translated text. No preamble. No explanation. No quotation marks.",
      "",
      "Text:",
      text,
    ].join("\n");
  }
  // Reverse direction (AR -> EN) or any other pair
  return [
    "You translate copy for ASAS Invest, a premium Dubai real estate firm.",
    "Translate the following text into professional, sophisticated English suitable for high-net-worth investors.",
    "Rules:",
    "- Preserve proper nouns, brand names, and numbers exactly.",
    "- Match an understated luxury tone — never salesy.",
    "- Output ONLY the translated text. No preamble. No explanation. No quotation marks.",
    "",
    "Text:",
    text,
  ].join("\n");
}

async function callLovableAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.2, // low — translation, not creative writing
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text =
    data?.choices?.[0]?.message?.content?.trim?.() ??
    data?.content?.[0]?.text?.trim?.() ??
    "";
  if (!text) throw new Error("AI gateway returned empty content");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: TranslateRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = (body.text ?? "").trim();
  const target_locale = body.target_locale;
  const source_locale = body.source_locale ?? "en";
  const cache_key = body.cache_key;

  if (!text) return json({ error: "text is required" }, 400);
  if (!target_locale) return json({ error: "target_locale is required" }, 400);
  if (!cache_key) return json({ error: "cache_key is required" }, 400);
  if (text.length > MAX_INPUT_CHARS) {
    return json({ error: `text exceeds ${MAX_INPUT_CHARS} characters` }, 413);
  }
  if (target_locale === source_locale) {
    return json({ translated_text: text, cached: true, identity: true });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "Supabase env not configured" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Cache lookup
  try {
    const { data: cached } = await supabase
      .from("translations_cache")
      .select("translated_text, source_text")
      .eq("cache_key", cache_key)
      .eq("target_locale", target_locale)
      .maybeSingle();

    if (cached && cached.source_text === text) {
      return json({ translated_text: cached.translated_text, cached: true });
    }
  } catch (e) {
    // Cache lookup failure is non-fatal; fall through and translate fresh.
    console.warn("translations_cache lookup failed:", e);
  }

  // 2. Translate
  let translated: string;
  try {
    const prompt = buildPrompt(text, source_locale, target_locale);
    translated = await callLovableAI(prompt);
  } catch (e) {
    console.error("AI translation failed:", e);
    // Graceful fallback: return the source text so UI doesn't show blanks.
    // The frontend will detect `auto: false` and won't show the AI chip.
    return json(
      {
        translated_text: text,
        cached: false,
        auto: false,
        error: String(e).slice(0, 200),
      },
      200,
    );
  }

  // 3. Upsert cache
  try {
    await supabase
      .from("translations_cache")
      .upsert(
        {
          cache_key,
          source_locale,
          target_locale,
          source_text: text,
          translated_text: translated,
          model: AI_MODEL,
          auto: true,
        },
        { onConflict: "cache_key" },
      );
  } catch (e) {
    console.warn("translations_cache upsert failed:", e);
    // Non-fatal: caller still gets a usable translation.
  }

  return json({ translated_text: translated, cached: false, auto: true });
});
