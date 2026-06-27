// Fire-and-forget spotlight analytics: writes to Supabase `spotlight_events`
// AND mirrors to GA4 (gtag) if present. Never throws into the UI.

import { supabase } from "@/integrations/supabase/client";

export type SpotlightEventType =
  | "impression" | "play" | "click_through"
  | "progress_25" | "progress_50" | "progress_75" | "progress_100";

export type SpotlightSurface = "home" | "archive" | "property";

const SID_KEY = "asas_sid";

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

interface TrackArgs {
  spotlightId: string;
  eventType: SpotlightEventType;
  surface: SpotlightSurface;
  locale: "en" | "ar";
}

export function trackSpotlight({ spotlightId, eventType, surface, locale }: TrackArgs): void {
  if (!spotlightId) return;

  // 1. Supabase (anon) — fire and forget; a missing table must never break UI.
  try {
    void (supabase as any)
      .from("spotlight_events")
      .insert({
        spotlight_id: spotlightId,
        event_type: eventType,
        surface,
        locale,
        session_id: getSessionId(),
      })
      .then((r: { error?: unknown }) => {
        if (r?.error) console.debug("spotlight event insert skipped", r.error);
      });
  } catch (e) {
    console.debug("spotlight event insert failed", e);
  }

  // 2. GA4 mirror — no-op if gtag isn't initialized.
  try {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("event", `spotlight_${eventType}`, { spotlight_id: spotlightId, surface, locale });
  } catch {
    /* ignore */
  }
}
