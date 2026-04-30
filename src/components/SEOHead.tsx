import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
}

const SITE_NAME_EN = "Asas Invest";
const SITE_NAME_AR = "أساس إنفست";
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
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").split("-")[0];
  const isAr = lang === "ar";
  const siteName = isAr ? SITE_NAME_AR : SITE_NAME_EN;

  // Append site name only if missing (works for both langs)
  const fullTitle =
    title.includes(SITE_NAME_EN) || title.includes(SITE_NAME_AR)
      ? title
      : `${title} | ${siteName}`;

  const url =
    canonical ||
    (typeof window !== "undefined" ? window.location.href.split("?")[0] : SITE_URL);
  const image = ogImage || DEFAULT_OG_IMAGE;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  const ogLocale = isAr ? "ar_AE" : "en_US";
  const ogLocaleAlt = isAr ? "en_US" : "ar_AE";

  // hreflang — language is selected client-side via ?lang query, same canonical URL serves both.
  const enHref = `${url}${url.includes("?") ? "&" : "?"}lang=en`;
  const arHref = `${url}${url.includes("?") ? "&" : "?"}lang=ar`;

  return (
    <Helmet htmlAttributes={{ lang, dir: isAr ? "rtl" : "ltr" }}>
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
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={ogLocaleAlt} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {/* hreflang for bilingual */}
      <link rel="alternate" hrefLang="en" href={enHref} />
      <link rel="alternate" hrefLang="ar" href={arHref} />
      <link rel="alternate" hrefLang="x-default" href={url} />

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
  "alternateName": "أساس إنفست",
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
  inLanguage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "url": `https://asasinvest.com/insights/${article.slug}`,
    "description": article.excerpt,
    "datePublished": article.datePublished,
    "inLanguage": article.inLanguage || "en",
    ...(article.image ? { "image": article.image } : {}),
    "author": { "@type": "Organization", "name": "Asas Invest" },
    "publisher": {
      "@type": "Organization",
      "name": "Asas Invest",
      "logo": { "@type": "ImageObject", "url": "https://asasinvest.com/favicon.png" },
    },
  };
}

// ── Phase 2: Advanced Schema Builders ───────────────────────────────────────

/** WebSite schema — enables Google sitelinks search box */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Asas Invest",
  "url": "https://asasinvest.com",
  "description": "Strategic property investment, leasing & wealth management in Dubai",
  "publisher": { "@type": "Organization", "name": "Asas Invest" },
  "inLanguage": ["en", "ar"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://asasinvest.com/off-plan?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

/** FAQPage schema — renders FAQ rich snippets in Google */
export function faqJsonLd(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/** CollectionPage schema — for property listing pages */
export function collectionPageJsonLd(page: {
  name: string;
  description: string;
  url: string;
  inLanguage?: string;
  properties?: Array<{ name: string; slug: string; image?: string; price?: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": page.name,
    "description": page.description,
    "url": page.url,
    "inLanguage": page.inLanguage || "en",
    "provider": { "@type": "Organization", "name": "Asas Invest" },
    ...(page.properties?.length ? {
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": page.properties.length,
        "itemListElement": page.properties.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://asasinvest.com/property/${p.slug}`,
          "name": p.name,
          ...(p.image ? { "image": p.image } : {}),
        })),
      },
    } : {}),
  };
}

/** Enhanced property schema with amenities and nearby places */
export function propertyDetailJsonLd(property: {
  name: string;
  slug: string;
  description: string;
  image?: string;
  images?: string[];
  priceRange?: string;
  location?: string;
  type?: string;
  developer?: string;
  handoverDate?: string;
  amenities?: string[];
  unitTypes?: string[];
  sizeRange?: string;
  inLanguage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.name,
    "url": `https://asasinvest.com/property/${property.slug}`,
    "description": property.description,
    "inLanguage": property.inLanguage || "en",
    ...(property.image ? { "image": property.image } : {}),
    ...(property.images?.length ? {
      "image": property.images.slice(0, 6),
    } : {}),
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
        "addressRegion": "Dubai",
        "addressCountry": "AE",
      },
    } : {}),
    "category": property.type === "ready" ? "Ready Property" : "Off-Plan Property",
    ...(property.developer ? {
      "seller": { "@type": "Organization", "name": property.developer },
    } : {}),
    ...(property.handoverDate ? {
      "datePosted": property.handoverDate,
    } : {}),
    ...(property.amenities?.length ? {
      "amenityFeature": property.amenities.map((a) => ({
        "@type": "LocationFeatureSpecification",
        "name": a,
        "value": true,
      })),
    } : {}),
    ...(property.sizeRange ? {
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": property.sizeRange,
        "unitText": "sqft",
      },
    } : {}),
    "broker": {
      "@type": "RealEstateAgent",
      "name": "Asas Invest",
      "url": "https://asasinvest.com",
    },
  };
}
