import { 
  Dumbbell, Waves, TreePine, Car, ShieldCheck, Baby, 
  Utensils, Wifi, Sparkles, Building2, Sun, Wind,
  LucideIcon
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useAutoTranslatedField } from "@/hooks/useAutoTranslatedField";
import { AutoTranslatedChip } from "@/components/ui/AutoTranslatedChip";
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

const getIcon = (iconName: string | null): LucideIcon => {
  if (iconName && iconMap[iconName.toLowerCase()]) {
    return iconMap[iconName.toLowerCase()];
  }
  return Sparkles;
};

const AmenityCategoryHeading = ({ category, propertyId }: { category: string; propertyId: string }) => {
  const { isRTL } = useLanguage();
  const field = useAutoTranslatedField(category, null, `amenity-category:${propertyId}:${category}`);
  return (
    <h3 className={cn(
      "text-accent text-xs font-medium tracking-widest uppercase mb-4 text-start",
      isRTL && "text-end"
    )}>
      {field.value}
      {field.autoTranslated && <AutoTranslatedChip />}
    </h3>
  );
};

const AmenityItem = ({ amenity }: { amenity: Tables<"amenities"> }) => {
  const { isRTL } = useLanguage();
  const Icon = getIcon(amenity.icon);
  const field = useAutoTranslatedField(amenity.name_en, amenity.name_ar, `amenity:${amenity.id}:name`);

  return (
    <div className="flex items-center p-4 border border-border hover:border-accent/30 transition-colors">
      <div className={cn(
        "w-10 h-10 border border-accent/30 flex items-center justify-center flex-shrink-0",
        isRTL ? "ms-3" : "me-3"
      )}>
        <Icon className="h-5 w-5 text-accent" strokeWidth={1} />
      </div>
      <span className="text-sm font-medium text-foreground">
        {field.value}
        {field.autoTranslated && <AutoTranslatedChip />}
      </span>
    </div>
  );
};

const PropertyAmenities = ({ property }: PropertyAmenitiesProps) => {
  const { t, isRTL } = useLanguage();

  const groupedAmenities = property.amenities.reduce((acc, amenity) => {
    const category = amenity.category || "General";
    if (!acc[category]) acc[category] = [];
    acc[category].push(amenity);
    return acc;
  }, {} as Record<string, Tables<"amenities">[]>);

  if (property.amenities.length === 0) {
    return (
      <div className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className={cn(
            "heading-section text-2xl md:text-3xl text-foreground text-start mb-8",
            isRTL && "text-end"
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
          "heading-section text-2xl md:text-3xl text-foreground text-start mb-8",
          isRTL && "text-end"
        )}>
          {t("sections.amenities")}
        </h2>

        <div className="space-y-10">
          {Object.entries(groupedAmenities).map(([category, amenities]) => (
            <div key={category}>
              <AmenityCategoryHeading category={category} propertyId={property.id} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenities.map((amenity) => (
                  <AmenityItem key={amenity.id} amenity={amenity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyAmenities;
