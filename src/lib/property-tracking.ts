import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "asas_session_id";
const VIEW_DEDUPE_PREFIX = "asas_viewed_";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

/**
 * Records a property page view once per session per property.
 */
export async function trackPropertyView(propertyId: string) {
  if (!propertyId) return;
  try {
    const key = VIEW_DEDUPE_PREFIX + propertyId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    await (supabase as any).from("property_views").insert({
      property_id: propertyId,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
      referrer: (document.referrer || "").slice(0, 1000) || null,
    });
  } catch (e) {
    // silent — analytics shouldn't break UX
    console.warn("trackPropertyView failed", e);
  }
}

export type DownloadKind = "brochure" | "floor_plan" | "plate" | "other";

/**
 * Records a brochure/floor-plan/plate download. Non-blocking from the caller's
 * point of view, but MUST await the insert internally — Supabase query builders
 * are lazy, so a non-awaited `void insert(...)` never sends the request.
 */
export async function trackPropertyDownload(
  propertyId: string,
  assetKind: DownloadKind,
  mediaId?: string | null,
) {
  if (!propertyId) return;
  try {
    const { error } = await (supabase as any).from("property_downloads").insert({
      property_id: propertyId,
      media_id: mediaId ?? null,
      asset_kind: assetKind,
      session_id: getSessionId(),
    });
    if (error) console.warn("trackPropertyDownload failed", error);
  } catch (e) {
    console.warn("trackPropertyDownload failed", e);
  }
}
