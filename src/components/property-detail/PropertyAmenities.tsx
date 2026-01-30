import { 
  Dumbbell, Waves, TreePine, Car, ShieldCheck, Baby, 
  Utensils, Wifi, Sparkles, Building2, Sun, Wind,
  LucideIcon
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyAmenitiesProps {
  property: Tables<"properties"> & {
    amenities: Tables<"amenities">[];
  };
}

const iconMap: Record<string, LucideIcon> = {
  gym: Dumbbell,
  pool: Waves,
  garden: TreePine,
  parking: Car,
  security: ShieldCheck,
  playground: Baby,
  restaurant: Utensils,
  wifi: Wifi,
  spa: Sparkles,
  concierge: Building2,
  terrace: Sun,
  ac: Wind,
};

const PropertyAmenities = ({ property }: PropertyAmenitiesProps) => {
  const { t, isRTL, language } = useLanguage();

  // Group amenities by category
  const groupedAmenities = property.amenities.reduce((acc, amenity) => {
    const category = amenity.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(amenity);
    return acc;
  }, {} as Record<string, Tables<"amenities">[]>);

  const getIcon = (iconName: string | null): LucideIcon => {
    if (iconName && iconMap[iconName.toLowerCase()]) {
      return iconMap[iconName.toLowerCase()];
    }
    return Sparkles;
  };

  if (property.amenities.length === 0) {
    return (
      <div className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className={cn(
            "font-serif text-2xl md:text-3xl font-medium text-foreground mb-8",
            isRTL && "text-right"
          )}>
            {t("sections.amenities")}
          </h2>
          <p className="text-muted-foreground">
            Amenities information coming soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "font-serif text-2xl md:text-3xl font-medium text-foreground mb-8",
          isRTL && "text-right"
        )}>
          {t("sections.amenities")}
        </h2>

        <div className="space-y-10">
          {Object.entries(groupedAmenities).map(([category, amenities]) => (
            <div key={category}>
              <h3 className={cn(
                "font-medium text-foreground mb-4 text-lg",
                isRTL && "text-right"
              )}>
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenities.map((amenity) => {
                  const Icon = getIcon(amenity.icon);
                  const name = language === "ar" && amenity.name_ar ? amenity.name_ar : amenity.name_en;
                  
                  return (
                    <div
                      key={amenity.id}
                      className={cn(
                        "flex items-center p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0",
                        isRTL ? "ml-3" : "mr-3"
                      )}>
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyAmenities;
