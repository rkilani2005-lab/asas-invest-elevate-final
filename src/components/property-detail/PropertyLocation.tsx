import { MapPin, Clock, Building, ShoppingBag, GraduationCap, Plane } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyLocationProps {
  property: Tables<"properties">;
}

const PropertyLocation = ({ property }: PropertyLocationProps) => {
  const { t, isRTL, language } = useLanguage();

  const location = language === "ar" && property.location_ar ? property.location_ar : property.location_en;
  const nearby = language === "ar" && property.nearby_ar 
    ? property.nearby_ar as Array<{ name: string; distance: string; type: string }>
    : property.nearby_en as Array<{ name: string; distance: string; type: string }> || [];

  const getIcon = (type: string) => {
    switch (type) {
      case "metro": return Clock;
      case "mall": return ShoppingBag;
      case "school": return GraduationCap;
      case "airport": return Plane;
      default: return Building;
    }
  };

  // Generate Google Maps embed URL
  const getMapUrl = () => {
    if (property.location_coords) {
      // location_coords is a point type, extract coordinates
      const coords = property.location_coords as unknown as { x: number; y: number };
      if (coords && coords.x && coords.y) {
        return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${coords.y},${coords.x}&zoom=15`;
      }
    }
    // Fallback to location name search
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(location || property.name_en + ", Dubai")}&zoom=14`;
  };

  return (
    <div className="py-12 bg-card">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "heading-section text-2xl md:text-3xl text-foreground mb-8",
          isRTL && "text-right"
        )}>
          {t("sections.location")}
        </h2>

        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-8",
          isRTL && "lg:flex-row-reverse"
        )}>
          {/* Map */}
          <div className="aspect-[4/3] overflow-hidden border border-border">
            <iframe
              src={getMapUrl()}
              width="100%"
              height="100%"
              style={{ border: 0, filter: "grayscale(80%) contrast(1.1)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${property.name_en} location`}
            />
          </div>

          {/* Nearby Places */}
          <div className={cn(isRTL && "text-right")}>
            <div className={cn(
              "flex items-center mb-6",
              isRTL && "flex-row-reverse"
            )}>
              <MapPin className={cn("h-5 w-5 text-accent", isRTL ? "ml-2" : "mr-2")} strokeWidth={1} />
              <span className="text-lg font-medium text-foreground">{location}</span>
            </div>

            {nearby.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-accent text-xs font-medium tracking-widest uppercase mb-4">Nearby Attractions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearby.map((place, index) => {
                    const Icon = getIcon(place.type);
                    return (
                      <div
                        key={index}
                        className="p-4 border border-border hover:border-accent/30 transition-colors"
                      >
                        <div className={cn(
                          "flex items-center mb-2",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div className={cn(
                            "w-8 h-8 border border-accent/30 flex items-center justify-center flex-shrink-0",
                            isRTL ? "ml-2" : "mr-2"
                          )}>
                            <Icon className="h-4 w-4 text-accent" strokeWidth={1} />
                          </div>
                          <p className="text-sm font-medium text-foreground">{place.name}</p>
                        </div>
                        <p className={cn(
                          "text-xs text-muted-foreground",
                          isRTL ? "pr-10 text-right" : "pl-10"
                        )}>
                          {place.distance}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {nearby.length === 0 && (
              <div className="border border-border p-6">
                <p className="text-muted-foreground">
                  Located in {location}, this property offers excellent connectivity to Dubai's key landmarks and amenities.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyLocation;
