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
    available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    reserved: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    sold: "bg-red-500/10 text-red-600 border-red-500/20"
  };

  const typeLabel = property.type === "off-plan" 
    ? t("property.type.offPlan") 
    : t("property.type.ready");

  return (
    <Link to={`/property/${property.slug}`} className="group block">
      <article className={cn(
        "bg-card border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-all duration-300 hover:shadow-elegant h-full flex flex-col",
        isRTL && "text-right"
      )}>
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={heroImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Badges */}
          <div className={cn(
            "absolute top-4 flex gap-2",
            isRTL ? "right-4" : "left-4"
          )}>
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-xs">
              {typeLabel}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs border", statusColors[property.status])}
            >
              {t(`property.status.${property.status}`)}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Developer */}
          {developer && (
            <p className="text-accent text-xs font-medium tracking-wide uppercase mb-2">
              {developer}
            </p>
          )}

          {/* Title */}
          <h3 className="font-serif text-lg font-medium text-foreground mb-3 group-hover:text-accent transition-colors line-clamp-2">
            {name}
          </h3>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {location && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <MapPin className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-1.5" : "mr-1.5")} />
                <span className="truncate">{location}</span>
              </div>
            )}
            {property.unit_types && property.unit_types.length > 0 && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Building2 className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-1.5" : "mr-1.5")} />
                <span className="truncate">{property.unit_types.join(", ")}</span>
              </div>
            )}
            {property.size_range && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Maximize2 className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-1.5" : "mr-1.5")} />
                <span className="truncate">{property.size_range}</span>
              </div>
            )}
            {property.handover_date && (
              <div className={cn("flex items-center text-muted-foreground text-sm", isRTL && "flex-row-reverse justify-end")}>
                <Calendar className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-1.5" : "mr-1.5")} />
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
                <p className="font-serif text-lg font-medium text-foreground">{property.price_range}</p>
              </div>
            )}
            <Button size="sm" variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10">
              {t("buttons.viewDetails")}
              <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-1.5 rotate-180" : "ml-1.5")} />
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default PropertyCard;
