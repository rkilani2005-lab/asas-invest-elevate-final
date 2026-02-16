import { Link } from "react-router-dom";
import { MapPin, Building2, Maximize2, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
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

  // Get hero image
  const heroImage = property.media?.find(m => m.type === "hero")?.url || 
                   property.media?.find(m => m.type === "render")?.url ||
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
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={heroImage}
            alt={name}
            className="w-full h-full object-cover brightness-105 saturate-105 group-hover:scale-105 transition-all duration-500"
          />
          {/* Badges */}
          <div className="absolute top-4 flex gap-2 start-4">
            <Badge variant="secondary" className="bg-white/95 text-foreground text-xs border border-accent/30 shadow-sm">
              {typeLabel}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs bg-white/95 shadow-sm", statusColors[property.status])}
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

          {/* Title - Gold heading */}
          <h3 className="heading-section text-lg text-accent mb-3 group-hover:text-gold-dark transition-colors line-clamp-2">
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
