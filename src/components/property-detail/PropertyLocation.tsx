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
    <div className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "font-serif text-2xl md:text-3xl font-medium text-foreground mb-8",
          isRTL && "text-right"
        )}>
          {t("sections.location")}
        </h2>

        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-8",
          isRTL && "lg:flex-row-reverse"
        )}>
          {/* Map */}
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <iframe
              src={getMapUrl()}
              width="100%"
              height="100%"
              style={{ border: 0 }}
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
              <MapPin className={cn("h-5 w-5 text-accent", isRTL ? "ml-2" : "mr-2")} />
              <span className="text-lg font-medium text-foreground">{location}</span>
            </div>

            {nearby.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-foreground mb-4">Nearby Attractions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearby.map((place, index) => {
                    const Icon = getIcon(place.type);
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center p-4 bg-background rounded-lg border border-border",
                          isRTL && "flex-row-reverse"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0",
                          isRTL ? "ml-3" : "mr-3"
                        )}>
                          <Icon className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{place.name}</p>
                          <p className="text-xs text-muted-foreground">{place.distance}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {nearby.length === 0 && (
              <div className="bg-background rounded-lg border border-border p-6">
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
