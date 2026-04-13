/**
 * generate-sitemap — Supabase Edge Function
 *
 * Generates a complete sitemap.xml combining:
 * 1. Static routes (homepage, listing pages, services)
 * 2. Dynamic property pages (from properties table)
 * 3. Dynamic insight/article pages (from insights table)
 *
 * Call: GET /functions/v1/generate-sitemap
 * Returns: XML sitemap
 *
 * Deploy: supabase functions deploy generate-sitemap
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://asasinvest.com";

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/off-plan", changefreq: "daily", priority: "0.9" },
  { path: "/ready", changefreq: "daily", priority: "0.9" },
  { path: "/buy", changefreq: "weekly", priority: "0.8" },
  { path: "/commercial", changefreq: "weekly", priority: "0.7" },
  { path: "/sell", changefreq: "monthly", priority: "0.7" },
  { path: "/invest", changefreq: "monthly", priority: "0.8" },
  { path: "/insights", changefreq: "daily", priority: "0.7" },
  { path: "/buy/guide", changefreq: "monthly", priority: "0.6" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/about/careers", changefreq: "monthly", priority: "0.4" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: string | null): string {
  if (!date) return new Date().toISOString().split("T")[0];
  try {
    return new Date(date).toISOString().split("T")[0];
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
    .select("slug, updated_at, type, is_featured")
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false });

  // Fetch all published insights
  const { data: insights } = await supabase
    .from("insights")
    .select("slug, updated_at, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Static routes
  for (const route of STATIC_ROUTES) {
    xml += `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  }

  // Property pages
  if (properties?.length) {
    for (const prop of properties) {
      if (!prop.slug) continue;
      xml += `  <url>
    <loc>${SITE_URL}/property/${escapeXml(prop.slug)}</loc>
    <lastmod>${formatDate(prop.updated_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${prop.is_featured ? "0.9" : "0.8"}</priority>
  </url>
`;
    }
  }

  // Insight pages
  if (insights?.length) {
    for (const article of insights) {
      if (!article.slug) continue;
      xml += `  <url>
    <loc>${SITE_URL}/insights/${escapeXml(article.slug)}</loc>
    <lastmod>${formatDate(article.published_at || article.updated_at)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  const totalUrls = STATIC_ROUTES.length + (properties?.length || 0) + (insights?.length || 0);
  console.log(`[generate-sitemap] Generated sitemap with ${totalUrls} URLs (${STATIC_ROUTES.length} static, ${properties?.length || 0} properties, ${insights?.length || 0} insights)`);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
