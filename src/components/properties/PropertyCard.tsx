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

  // Get hero image - prioritize hero, then render, then first gallery image, then any media
  const sortedMedia = [...(property.media || [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const heroImage =
    sortedMedia.find((m) => m.type === "hero")?.url ||
    sortedMedia.find((m) => m.type === "render")?.url ||
    sortedMedia.find((m) => m.type === "gallery")?.url ||
    sortedMedia[0]?.url ||
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

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {location && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
                <span className="truncate">{location}</span>
              </div>
            )}
            {property.unit_types && property.unit_types.length > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Building2 className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
                <span className="truncate">{property.unit_types.join(", ")}</span>
              </div>
            )}
            {property.size_range && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Maximize2 className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
                <span className="truncate">{property.size_range}</span>
              </div>
            )}
            {property.handover_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4 flex-shrink-0 icon-luxury" strokeWidth={1} />
                <span className="truncate">{new Date(property.handover_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Price & CTA */}
          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
            {property.price_range && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("property.from")}</p>
                <p className="heading-section text-lg text-foreground">{property.price_range}</p>
              </div>
            )}
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
