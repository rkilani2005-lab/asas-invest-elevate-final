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
            className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          />
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          {/* Badges */}
          <div className={cn(
            "absolute top-4 flex gap-2",
            isRTL ? "right-4" : "left-4"
          )}>
            <Badge variant="secondary" className="bg-background/90 text-foreground text-xs border border-border">
              {typeLabel}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs", statusColors[property.status])}
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

          {/* Title */}
          <h3 className="heading-section text-lg text-foreground mb-3 group-hover:text-accent transition-colors line-clamp-2">
            {name}
          </h3>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {location && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <MapPin className={cn("h-4 w-4 flex-shrink-0 icon-luxury", isRTL ? "ml-1.5" : "mr-1.5")} strokeWidth={1} />
                <span className="truncate">{location}</span>
              </div>
            )}
            {property.unit_types && property.unit_types.length > 0 && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Building2 className={cn("h-4 w-4 flex-shrink-0 icon-luxury", isRTL ? "ml-1.5" : "mr-1.5")} strokeWidth={1} />
                <span className="truncate">{property.unit_types.join(", ")}</span>
              </div>
            )}
            {property.size_range && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Maximize2 className={cn("h-4 w-4 flex-shrink-0 icon-luxury", isRTL ? "ml-1.5" : "mr-1.5")} strokeWidth={1} />
                <span className="truncate">{property.size_range}</span>
              </div>
            )}
            {property.handover_date && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Calendar className={cn("h-4 w-4 flex-shrink-0 icon-luxury", isRTL ? "ml-1.5" : "mr-1.5")} strokeWidth={1} />
                <span className="truncate">{new Date(property.handover_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Price & CTA */}
          <div className={cn(
            "mt-auto pt-4 border-t border-border flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            {property.price_range && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("property.from")}</p>
                <p className="heading-section text-lg text-foreground">{property.price_range}</p>
              </div>
            )}
            <Button size="sm" variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10">
              {t("buttons.viewDetails")}
              <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-1.5 rotate-180" : "ml-1.5")} strokeWidth={1} />
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default PropertyCard;
