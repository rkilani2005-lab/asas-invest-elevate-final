import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
}

const SITE_NAME = "Asas Invest";
const DEFAULT_OG_IMAGE = "https://asasinvest.com/images/og-default.jpg";
const SITE_URL = "https://asasinvest.com";

export default function SEOHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  noIndex = false,
  jsonLd,
}: SEOHeadProps) {
  const fullTitle = title.includes("Asas") ? title : `${title} | ${SITE_NAME}`;
  const url = canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0] : SITE_URL);
  const image = ogImage || DEFAULT_OG_IMAGE;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;

  // Normalize JSON-LD to array
  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="ar_AE" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {/* hreflang for bilingual */}
      <link rel="alternate" hreflang="en" href={url} />
      <link rel="alternate" hreflang="ar" href={url} />
      <link rel="alternate" hreflang="x-default" href={url} />

      {/* JSON-LD Structured Data */}
      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

// ── Reusable JSON-LD builders ───────────────────────────────────────────────

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Asas Invest",
  "url": "https://asasinvest.com",
  "logo": "https://asasinvest.com/favicon.png",
  "description": "Strategic property investment, leasing & wealth management in Dubai and the UAE",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Dubai",
    "addressRegion": "Dubai",
    "addressCountry": "AE",
  },
  "areaServed": {
    "@type": "Place",
    "name": "Dubai, UAE",
  },
  "priceRange": "AED 500K - 50M+",
};

export function breadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      ...(item.url ? { "item": item.url } : {}),
    })),
  };
}

export function propertyJsonLd(property: {
  name: string;
  slug: string;
  description: string;
  image?: string;
  priceRange?: string;
  location?: string;
  type?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.name,
    "url": `https://asasinvest.com/property/${property.slug}`,
    "description": property.description,
    ...(property.image ? { "image": property.image } : {}),
    ...(property.priceRange ? {
      "offers": {
        "@type": "Offer",
        "priceCurrency": "AED",
        "price": property.priceRange,
        "availability": "https://schema.org/InStock",
      },
    } : {}),
    ...(property.location ? {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": property.location,
        "addressCountry": "AE",
      },
    } : {}),
    "category": property.type === "ready" ? "Ready Property" : "Off-Plan Property",
  };
}

export function articleJsonLd(article: {
  title: string;
  slug: string;
  excerpt: string;
  datePublished: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "url": `https://asasinvest.com/insights/${article.slug}`,
    "description": article.excerpt,
    "datePublished": article.datePublished,
    ...(article.image ? { "image": article.image } : {}),
    "author": { "@type": "Organization", "name": "Asas Invest" },
    "publisher": {
      "@type": "Organization",
      "name": "Asas Invest",
      "logo": { "@type": "ImageObject", "url": "https://asasinvest.com/favicon.png" },
    },
  };
}
