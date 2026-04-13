/**
 * sitemap — Supabase Edge Function
 *
 * Generates a dynamic sitemap.xml that includes:
 * - All static routes (homepage, off-plan, ready, buy, etc.)
 * - All published property pages (/property/{slug})
 * - All published insight articles (/insights/{slug})
 *
 * Deploy: supabase functions deploy sitemap
 * URL: https://yinswjhmcgftinrjsokv.supabase.co/functions/v1/sitemap
 *
 * Point robots.txt Sitemap directive to this URL or proxy it
 * through your domain at /sitemap.xml
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://asasinvest.com";

const STATIC_ROUTES = [
  { path: "/",             changefreq: "weekly",  priority: "1.0" },
  { path: "/off-plan",     changefreq: "daily",   priority: "0.9" },
  { path: "/ready",        changefreq: "daily",   priority: "0.9" },
  { path: "/buy",          changefreq: "weekly",  priority: "0.8" },
  { path: "/commercial",   changefreq: "weekly",  priority: "0.7" },
  { path: "/sell",         changefreq: "monthly", priority: "0.7" },
  { path: "/invest",       changefreq: "monthly", priority: "0.8" },
  { path: "/insights",     changefreq: "daily",   priority: "0.7" },
  { path: "/buy/guide",    changefreq: "monthly", priority: "0.6" },
  { path: "/about",        changefreq: "monthly", priority: "0.6" },
  { path: "/about/careers", changefreq: "monthly", priority: "0.4" },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(d: string | null): string {
  if (!d) return new Date().toISOString().split("T")[0];
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch all published properties
  const { data: properties } = await supabase
    .from("properties")
    .select("slug, updated_at, created_at, name_en")
    .order("created_at", { ascending: false });

  // Fetch all published insights
  const { data: insights } = await supabase
    .from("insights")
    .select("slug, updated_at, published_at, title_en")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const urls: string[] = [];

  // Static routes
  for (const route of STATIC_ROUTES) {
    urls.push(`  <url>
    <loc>${escapeXml(SITE_URL + route.path)}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  // Property pages
  for (const p of (properties || [])) {
    if (!p.slug) continue;
    urls.push(`  <url>
    <loc>${escapeXml(SITE_URL + "/property/" + p.slug)}</loc>
    <lastmod>${formatDate(p.updated_at || p.created_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Insight articles
  for (const a of (insights || [])) {
    if (!a.slug) continue;
    urls.push(`  <url>
    <loc>${escapeXml(SITE_URL + "/insights/" + a.slug)}</loc>
    <lastmod>${formatDate(a.updated_at || a.published_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
