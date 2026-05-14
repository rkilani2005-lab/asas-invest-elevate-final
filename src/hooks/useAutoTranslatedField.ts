import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * useAutoTranslatedField
 * ----------------------
 * Drop-in replacement for the common ASAS pattern:
 *
 *   const name = language === "ar" && p.name_ar ? p.name_ar : p.name_en;
 *
 * Returns the AR value if present. If empty/missing, asynchronously fetches
 * an AI translation of the EN value via the `translate-content` edge function
 * (which caches into translations_cache so repeat reads are instant).
 *
 * Usage:
 *   const name = useAutoTranslatedField(p.name_en, p.name_ar, `property:${p.id}:name`);
 *   return <h3>{name.value} {name.autoTranslated && <AiChip />}</h3>;
 *
 * Behaviour notes:
 *   • In English, returns the EN value with no network call.
 *   • If AR is present (any non-whitespace), returns it as-is and marks
 *     autoTranslated=false so the UI knows it's human-curated.
 *   • Fetch is keyed on cacheKey + EN text. If either changes the hook
 *     refetches, so admin edits propagate without manual cache busts.
 *   • On AI failure the hook silently falls back to the EN value with
 *     autoTranslated=false so the page never shows a blank field.
 */

export type AutoTranslatedField = {
  /** The text to render. */
  value: string;
  /** True when the value came from the AI fallback (not the original AR field). */
  autoTranslated: boolean;
  /** True while the AI request is in flight. */
  loading: boolean;
};

export function useAutoTranslatedField(
  enText: string | null | undefined,
  arText: string | null | undefined,
  cacheKey: string,
): AutoTranslatedField {
  const { language } = useLanguage();

  const initialValue =
    language === "ar"
      ? (arText && arText.trim() ? arText : enText) ?? ""
      : enText ?? "";

  const [state, setState] = useState<AutoTranslatedField>({
    value: initialValue,
    autoTranslated: false,
    loading: false,
  });

  // Track the last fetch we triggered so a fast language switch / prop change
  // doesn't race a stale response into setState.
  const lastFetchKey = useRef<string>("");

  useEffect(() => {
    // English path — never fetch.
    if (language !== "ar") {
      setState({ value: enText ?? "", autoTranslated: false, loading: false });
      return;
    }

    // Arabic value present — use it.
    if (arText && arText.trim()) {
      setState({ value: arText, autoTranslated: false, loading: false });
      return;
    }

    // No source to translate from.
    if (!enText || !enText.trim()) {
      setState({ value: "", autoTranslated: false, loading: false });
      return;
    }

    // We need an AI fallback. Fetch (the edge function checks its own cache).
    const fetchKey = `${cacheKey}::${enText}`;
    lastFetchKey.current = fetchKey;

    // Show the EN text immediately as a graceful loading state instead of a blank.
    setState({ value: enText, autoTranslated: false, loading: true });

    let cancelled = false;
    supabase.functions
      .invoke("translate-content", {
        body: {
          text: enText,
          source_locale: "en",
          target_locale: "ar",
          cache_key: cacheKey,
        },
      })
      .then(({ data, error }) => {
        if (cancelled || lastFetchKey.current !== fetchKey) return;
        if (error || !data?.translated_text) {
          // Silent fallback to EN — better than a blank cell.
          setState({ value: enText, autoTranslated: false, loading: false });
          return;
        }
        setState({
          value: data.translated_text,
          // The edge function returns auto=true when it actually called the AI,
          // auto=false on graceful failure (text == source). Default to true
          // when present so the chip shows.
          autoTranslated: data.auto !== false && data.translated_text !== enText,
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled || lastFetchKey.current !== fetchKey) return;
        setState({ value: enText, autoTranslated: false, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [language, enText, arText, cacheKey]);

  return state;
}
