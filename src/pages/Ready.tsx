import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/properties/PropertyCard";
import PropertyFilters, { PropertyFiltersState } from "@/components/properties/PropertyFilters";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type PropertyWithMedia = Tables<"properties"> & {
  media: Tables<"media">[];
};

const Ready = () => {
  const { t, isRTL, language } = useLanguage();
  const [filters, setFilters] = useState<PropertyFiltersState>({
    search: "",
    location: "",
    developer: "",
    bedrooms: "",
    priceRange: "",
    category: "",
  });

  // Fetch ready properties
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", "ready"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`*, media(*)`)
        .eq("type", "ready")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as PropertyWithMedia[];
    },
  });

  // Extract unique locations and developers for filters
  const { locations, developers } = useMemo(() => {
    if (!properties) return { locations: [], developers: [] };

    const locs = new Set<string>();
    const devs = new Set<string>();

    properties.forEach((p) => {
      const loc = language === "ar" && p.location_ar ? p.location_ar : p.location_en;
      const dev = language === "ar" && p.developer_ar ? p.developer_ar : p.developer_en;
      if (loc) locs.add(loc);
      if (dev) devs.add(dev);
    });

    return {
      locations: Array.from(locs),
      developers: Array.from(devs),
    };
  }, [properties, language]);

  // Filter properties
  const filteredProperties = useMemo(() => {
    if (!properties) return [];

    return properties.filter((property) => {
      const name = language === "ar" && property.name_ar ? property.name_ar : property.name_en;
      const location = language === "ar" && property.location_ar ? property.location_ar : property.location_en;
      const developer = language === "ar" && property.developer_ar ? property.developer_ar : property.developer_en;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          name.toLowerCase().includes(searchLower) ||
          (location && location.toLowerCase().includes(searchLower)) ||
          (developer && developer.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Location filter
      if (filters.location && location !== filters.location) {
        return false;
      }

      // Developer filter
      if (filters.developer && developer !== filters.developer) {
        return false;
      }

      // Bedrooms filter
      if (filters.bedrooms && property.unit_types) {
        const hasMatchingBedroom = property.unit_types.some((unit) =>
          unit.toLowerCase().includes(filters.bedrooms.toLowerCase())
        );
        if (!hasMatchingBedroom) return false;
      }

      // Category filter
      if (filters.category && (property as any).category !== filters.category) {
        return false;
      }

      return true;
    });
  }, [properties, filters, language]);

  return (<>
      <SEOHead
        title="Ready Properties for Sale in Dubai | Asas Invest"
        description="Browse move-in ready apartments, villas and penthouses across Dubai premium communities. Immediate handover, freehold ownership."
        canonical="https://asasinvest.com/ready"
        jsonLd={breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"Ready Properties"}])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />

      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          {/* Header */}
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-eyebrow text-accent mb-4">
              {t("readyPage.subtitle")}
            </p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">
              {t("readyPage.title")}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t("readyPage.description")}
            </p>
          </ScrollReveal>

          {/* Filters */}
          <PropertyFilters
            filters={filters}
            onFiltersChange={setFilters}
            locations={locations}
            developers={developers}
          />

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-luxury rounded-lg overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full bg-secondary" />
                  <div className="p-5 space-y-3 bg-card">
                    <Skeleton className="h-4 w-24 bg-secondary" />
                    <Skeleton className="h-6 w-3/4 bg-secondary" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-4 w-full bg-secondary" />
                      <Skeleton className="h-4 w-full bg-secondary" />
                    </div>
                    <Skeleton className="h-10 w-full mt-4 bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16 border border-border">
              <p className="text-muted-foreground text-lg mb-4">
                {t("readyPage.noResults")}
              </p>
              <Button
                variant="luxury"
                onClick={() =>
                  setFilters({
                    search: "",
                    location: "",
                    developer: "",
                    bedrooms: "",
                    priceRange: "",
                    category: "",
                  })
                }
              >
                {t("readyPage.clearFilters")}
              </Button>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <StaggerItem key={property.id}>
                  <PropertyCard property={property} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </main>

      <Footer />
    </div>
  </>);
};

export default Ready;
