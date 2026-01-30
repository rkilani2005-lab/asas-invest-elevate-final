import { MapPin, Building2, Maximize2, Calendar, Car, Key } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyOverviewProps {
  property: Tables<"properties">;
}

const PropertyOverview = ({ property }: PropertyOverviewProps) => {
  const { t, isRTL, language } = useLanguage();

  const overview = language === "ar" && property.overview_ar ? property.overview_ar : property.overview_en;
  const location = language === "ar" && property.location_ar ? property.location_ar : property.location_en;
  const highlights = language === "ar" && property.highlights_ar 
    ? property.highlights_ar as string[]
    : property.highlights_en as string[] || [];

  const specs = [
    { icon: MapPin, label: t("property.location"), value: location },
    { icon: Building2, label: t("property.unitTypes"), value: property.unit_types?.join(", ") },
    { icon: Maximize2, label: t("property.sizeRange"), value: property.size_range },
    { icon: Calendar, label: t("property.handover"), value: property.handover_date ? new Date(property.handover_date).toLocaleDateString() : null },
    { icon: Key, label: t("property.ownership"), value: property.ownership_type },
    { icon: Car, label: t("property.parking"), value: property.parking },
  ].filter(spec => spec.value);

  return (
    <div className="py-12 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-12",
          isRTL && "lg:flex-row-reverse"
        )}>
          {/* Main Content */}
          <div className={cn("lg:col-span-2", isRTL && "text-right")}>
            <h2 className="heading-section text-2xl md:text-3xl text-accent mb-6">
              {t("sections.overview")}
            </h2>
            
            {overview && (
              <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed mb-8">
                <p>{overview}</p>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mt-8">
                <h3 className="text-accent text-xs font-medium tracking-widest uppercase mb-4">Key Highlights</h3>
                <ul className={cn(
                  "grid grid-cols-1 md:grid-cols-2 gap-3",
                  isRTL && "text-right"
                )}>
                  {highlights.map((highlight, index) => (
                    <li 
                      key={index}
                      className={cn(
                        "flex items-center text-muted-foreground",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 bg-accent flex-shrink-0",
                        isRTL ? "ml-3" : "mr-3"
                      )} />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Specs Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-accent/30 p-6 sticky top-40 shadow-card">
              <h3 className={cn(
                "text-accent text-xs font-medium tracking-widest uppercase mb-6",
                isRTL && "text-right"
              )}>
                Property Details
              </h3>
              
              {/* Price */}
              {property.price_range && (
                <div className={cn(
                  "pb-4 mb-4 border-b border-border",
                  isRTL && "text-right"
                )}>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t("property.price")}</p>
                  <p className="heading-section text-2xl text-foreground">
                    {property.price_range}
                  </p>
                </div>
              )}

              {/* Specs List */}
              <div className="space-y-4">
                {specs.map((spec, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-start",
                      isRTL && "flex-row-reverse text-right"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 border border-accent/30 flex items-center justify-center flex-shrink-0",
                      isRTL ? "ml-3" : "mr-3"
                    )}>
                      <spec.icon className="h-5 w-5 text-accent" strokeWidth={1} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wider">{spec.label}</p>
                      <p className="text-sm font-medium text-foreground">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOverview;
