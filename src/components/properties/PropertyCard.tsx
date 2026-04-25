import { Link } from "react-router-dom";
import { MapPin, Building2, Maximize2, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  // Get hero image - prioritize hero, then render/interior, then any media (sorted)
  const sortedMedia = [...(property.media || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const heroImage =
    sortedMedia.find((m) => m.type === "hero")?.url ||
    sortedMedia.find((m) => m.type === "render")?.url ||
    sortedMedia.find((m) => m.type === "interior")?.url ||
    sortedMedia.find((m) => !!m.url && m.type !== "video" && m.type !== "brochure")?.url ||
    "/placeholder.svg";

  const statusColors = {
    available: "bg-accent/10 text-accent border-accent/30",
    reserved: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    sold: "bg-red-500/10 text-red-500 border-red-500/30"
  };

  const typeLabel = property.type === "off-plan" 
    ? t("property.type.offPlan") 
    : t("property.type.ready");

  return (
    <Link to={`/property/${property.slug}`} className="group block">
      <article className={cn(
        "card-luxury rounded-lg overflow-hidden h-full flex flex-col",
        isRTL && "text-right"
      )}>
        {/* Image Container */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProgressiveImage
            src={getStorageThumbnailUrl(heroImage, 900, 90)}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
            decoding="async"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />
          {/* Badges */}
          <div className="absolute top-3 flex gap-2 start-3">
            <Badge variant="secondary" className="bg-black/60 text-white text-xs border-0 backdrop-blur-sm" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}>
              {typeLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs backdrop-blur-sm border-0", statusColors[property.status])}
            >
              {t(`property.status.${property.status}`)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col bg-card">
          {/* Developer */}
          {developer && (
            <p className="text-accent text-xs font-medium tracking-widest uppercase mb-2">
              {developer}
            </p>
          )}

          {/* Title - dark serif, readable */}
          <h3 className="heading-section text-lg text-foreground mb-3 group-hover:text-accent transition-colors duration-300 line-clamp-2">
            {name}
          </h3>

          {/* Details Grid - always 4 slots so card heights stay consistent */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
              <span className={cn("truncate", location ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                {location || t("property.placeholder.location")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Building2 className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
              <span className={cn("truncate", property.unit_types?.length ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                {property.unit_types?.length ? property.unit_types.join(", ") : t("property.placeholder.unitTypes")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Maximize2 className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
              <span className={cn("truncate", property.size_range ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                {property.size_range || t("property.placeholder.size")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
              <span className={cn("truncate", property.handover_date ? "text-muted-foreground" : "text-muted-foreground/50 italic")}>
                {property.handover_date ? new Date(property.handover_date).toLocaleDateString() : t("property.placeholder.handover")}
              </span>
            </div>
          </div>

          {/* Price & CTA */}
          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("property.from")}</p>
              <p className={cn(
                "heading-section text-lg",
                property.price_range ? "text-foreground" : "text-muted-foreground/50 italic"
              )}>
                {property.price_range || t("property.placeholder.price")}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10">
              {t("buttons.viewDetails")}
              <ArrowRight className="h-4 w-4 ms-1.5 rtl-flip" strokeWidth={1} />
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default PropertyCard;
