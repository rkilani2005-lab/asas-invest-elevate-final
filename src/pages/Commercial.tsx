import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/properties/PropertyCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type PropertyWithMedia = Tables<"properties"> & { media: Tables<"media">[] };

const Commercial = () => {
  const { t, isRTL, language } = useLanguage();
  const [filters, setFilters] = useState({ search: "", officeType: "", ownership: "", fitOut: "" });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", "commercial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`*, media(*)`)
        .eq("category", "commercial")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as PropertyWithMedia[];
    },
  });

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter((p) => {
      const name = language === "ar" && p.name_ar ? p.name_ar : p.name_en;
      if (filters.search && !name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.ownership && p.ownership_type !== filters.ownership) return false;
      return true;
    });
  }, [properties, filters, language]);

  const clearFilters = () => setFilters({ search: "", officeType: "", ownership: "", fitOut: "" });

  return (<>
      <SEOHead
        title={t("seo.commercial.title")}
        description={t("seo.commercial.description")}
        canonical="https://asasinvest.com/commercial"
        jsonLd={breadcrumbJsonLd([
          { name: t("seo.breadcrumb.home"), url: "https://asasinvest.com" },
          { name: t("seo.breadcrumb.commercial") },
        ])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-eyebrow text-accent mb-4">{t("commercial.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">{t("commercial.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("commercial.description")}</p>
          </ScrollReveal>

          {/* Filters */}
          <div className="card-luxury p-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder={t("filters.search")}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <Select value={filters.officeType} onValueChange={(v) => setFilters(prev => ({ ...prev, officeType: v }))}>
                <SelectTrigger><SelectValue placeholder={t("commercial.filterType")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">{t("commercial.office")}</SelectItem>
                  <SelectItem value="retail">{t("commercial.retail")}</SelectItem>
                  <SelectItem value="warehouse">{t("commercial.warehouse")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.ownership} onValueChange={(v) => setFilters(prev => ({ ...prev, ownership: v }))}>
                <SelectTrigger><SelectValue placeholder={t("commercial.filterOwnership")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="freehold">{t("commercial.freehold")}</SelectItem>
                  <SelectItem value="leasehold">{t("commercial.leasehold")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.fitOut} onValueChange={(v) => setFilters(prev => ({ ...prev, fitOut: v }))}>
                <SelectTrigger><SelectValue placeholder={t("commercial.filterCondition")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shell_core">{t("commercial.shellCore")}</SelectItem>
                  <SelectItem value="fitted">{t("commercial.fitted")}</SelectItem>
                  <SelectItem value="furnished">{t("commercial.furnished")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-luxury rounded-lg overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full bg-secondary" />
                  <div className="p-5 space-y-3 bg-card">
                    <Skeleton className="h-6 w-3/4 bg-secondary" />
                    <Skeleton className="h-10 w-full bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16 border border-border">
              <p className="text-muted-foreground text-lg mb-4">{t("commercial.noResults")}</p>
              <Button variant="luxury" onClick={clearFilters}>{t("buttons.clearFilters")}</Button>
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

export default Commercial;
