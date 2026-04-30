import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import ProgressiveImage from "@/components/ui/progressive-image";
import { getStorageThumbnailUrl } from "@/lib/image-utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyCardProps {
  property: Tables<"properties"> & {
    media?: Tables<"media">[];
  };
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const { t, isRTL, language } = useLanguage();

  const name = language === "ar" && property.name_ar ? property.name_ar : property.name_en;
  const location = language === "ar" && property.location_ar ? property.location_ar : property.location_en;
  const developer = language === "ar" && property.developer_ar ? property.developer_ar : property.developer_en;

  // Pick a hero image
  const sortedMedia = [...(property.media || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const heroImage =
    sortedMedia.find((m) => m.type === "hero")?.url ||
    sortedMedia.find((m) => m.type === "render")?.url ||
    sortedMedia.find((m) => m.type === "interior")?.url ||
    sortedMedia.find((m) => !!m.url && m.type !== "video" && m.type !== "brochure")?.url ||
    "/placeholder.svg";

  const typeLabel = property.type === "off-plan"
    ? t("property.type.offPlan")
    : t("property.type.ready");

  // Optional yield value (rental yield % stored on property if available)
  const yieldValue = (property as any).rental_yield ?? (property as any).yield_percentage;

  // Build meta tokens (joined with diamond glyph)
  const metaTokens: string[] = [];
  if (property.unit_types?.length) metaTokens.push(property.unit_types.join(", "));
  if (property.size_range) metaTokens.push(property.size_range);
  if (property.handover_date) {
    const d = new Date(property.handover_date);
    if (!isNaN(d.getTime())) {
      const q = Math.floor(d.getMonth() / 3) + 1;
      metaTokens.push(t("property.handoverFormat", { quarter: q, year: d.getFullYear() }));
    }
  }

  // Secondary line: price-per-sqft + handover (best-effort)
  const pricePerSqft = (property as any).price_per_sqft;
  const secondaryLineParts: string[] = [];
  if (pricePerSqft) secondaryLineParts.push(t("property.pricePerSqft", { price: pricePerSqft }));
  if (property.handover_date) {
    const d = new Date(property.handover_date);
    if (!isNaN(d.getTime())) {
      const q = Math.floor(d.getMonth() / 3) + 1;
      secondaryLineParts.push(t("property.handoverFormat", { quarter: q, year: d.getFullYear() }));
    }
  }

  return (
    <Link to={`/property/${property.slug}`} className="group block">
      <article className={cn(
        "card-luxury h-full flex flex-col",
        isRTL && "text-end"
      )}>
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProgressiveImage
            src={getStorageThumbnailUrl(heroImage, 900, 90)}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
            decoding="async"
          />
          {/* Frosted type badge — top-left */}
          <div className="absolute top-3 start-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-charcoal backdrop-blur-md"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: 'rgba(255,255,255,0.78)',
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            >
              {typeLabel}
            </span>
          </div>
          {/* Yield badge — top-right (only if available) */}
          {yieldValue && (
            <div className="absolute top-3 end-3">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-charcoal"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: 'hsl(var(--accent))',
                }}
              >
                {yieldValue}% {t("property.yieldSuffix")}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col bg-card">
          {/* Developer */}
          {developer && (
            <p className="text-xs font-medium text-accent mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              {developer}
            </p>
          )}

          {/* Title */}
          <h3 className="heading-section text-xl text-foreground mb-3 group-hover:text-accent transition-colors duration-300 line-clamp-2">
            {name}
          </h3>

          {/* Price */}
          <div className="mb-2">
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
              {t("property.from")}
            </p>
            <p
              className={cn(
                property.price_range ? "text-foreground" : "text-muted-foreground/50 italic"
              )}
              style={{
                fontFamily: "'Satoshi', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: '1.5rem',
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
              }}
            >
              {property.price_range || t("property.placeholder.price")}
            </p>
          </div>

          {/* Secondary line */}
          {secondaryLineParts.length > 0 && (
            <p
              className="text-xs text-muted-foreground mb-3"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {secondaryLineParts.join(' · ')}
            </p>
          )}

          {/* Meta tokens with gold diamond separators */}
          {metaTokens.length > 0 && (
            <div
              className="mt-auto pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {metaTokens.map((tk, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-accent" aria-hidden>◇</span>}
                  <span>{tk}</span>
                </span>
              ))}
            </div>
          )}

          {/* Location footer */}
          {location && (
            <p className="text-xs text-muted-foreground/80 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              {location}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
};

export default PropertyCard;
