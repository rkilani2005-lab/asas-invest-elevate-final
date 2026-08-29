/**
 * spotlight-thumbnail — resolve a video's cover image and store it permanently.
 *
 * Instagram (and some other providers) don't expose a thumbnail to other sites,
 * so the front-end tiles render dark. This admin-only function fetches the post's
 * og:image server-side (with a link-preview user-agent), DOWNLOADS the image into
 * our own storage bucket, and saves the permanent public URL to
 * spotlights.thumbnail_url. Instagram CDN URLs expire, so we cache the bytes —
 * not the link — and the front-end just uses thumbnail_url from then on.
 *
 * Admin-gated (Bearer JWT + user_roles.admin). Public config verify_jwt=false.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUCKET = "property-media";
// A link-preview user-agent — the one Facebook/Instagram serve og: tags to.
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

function decodeEntities(s: string): string {
  return s
    .replace(/\\u0026/g, "&").replace(/\\\//g, "/")
    .replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** Pull a cover image URL out of a page's HTML (og:image, or IG's JSON fields). */
async function resolveCover(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html,*/*" }, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const patterns = [
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /"display_url":"([^"]+)"/i,
      /"thumbnail_src":"([^"]+)"/i,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m && m[1]) return decodeEntities(m[1]);
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await (admin as any).from("user_roles").select("role")
      .eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const spotlightId = String(body.spotlight_id || "").trim() || null;
    let videoUrl = String(body.url || "").trim() || null;
    if (spotlightId && !videoUrl) {
      const { data: s } = await (admin as any).from("spotlights").select("video_url").eq("id", spotlightId).maybeSingle();
      videoUrl = s?.video_url || null;
    }
    if (!videoUrl) return json({ error: "No video URL to fetch a cover from." }, 400);

    const cover = await resolveCover(videoUrl);
    if (!cover) return json({ error: "Couldn't find a cover image for this link — it may be private or blocked. Paste a Thumbnail URL instead." }, 422);

    const imgRes = await fetch(cover, { headers: { "User-Agent": UA } });
    if (!imgRes.ok) return json({ error: `Cover download failed (HTTP ${imgRes.status}).` }, 502);
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return json({ error: "The cover link did not return an image." }, 422);

    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `spotlights/${spotlightId || crypto.randomUUID()}.${ext}`;

    const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: ct, upsert: true });
    if (up.error) return json({ error: `Storage upload failed: ${up.error.message}` }, 500);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const thumbnail_url = `${pub.publicUrl}?v=${Date.now()}`; // cache-bust when refetched

    if (spotlightId) {
      await (admin as any).from("spotlights")
        .update({ thumbnail_url, updated_at: new Date().toISOString() }).eq("id", spotlightId);
    }

    return json({ ok: true, thumbnail_url });
  } catch (e) {
    console.error("spotlight-thumbnail error:", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
