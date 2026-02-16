import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertyCard from "@/components/properties/PropertyCard";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type PropertyWithMedia = Tables<"properties"> & {
  media: Tables<"media">[];
};

const FeaturedProperties = () => {
  const { t, isRTL } = useLanguage();

  // Fetch featured properties (both off-plan and ready)
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`*, media(*)`)
        .eq("status", "available")
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(9);

      if (error) throw error;
      return data as PropertyWithMedia[];
    },
  });

  const offPlanProperties = properties?.filter(p => p.type === "off-plan") || [];
  const readyProperties = properties?.filter(p => p.type === "ready") || [];

  const PropertySkeleton = () => (
    <div className="card-luxury rounded-lg overflow-hidden">
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
  );

  return (
    <section id="properties" className="py-24 bg-card grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8 relative z-10", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-eyebrow text-accent mb-4">
            {t("featuredProperties.subtitle")}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-accent mb-6">
            {t("featuredProperties.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("featuredProperties.description")}
          </p>
        </ScrollReveal>

        {/* Property Tabs */}
        <Tabs defaultValue="off-plan" className="w-full">
          <div className="flex justify-center mb-10">
          <TabsList className="bg-transparent border border-accent/30 p-1 rounded-none">
              <TabsTrigger 
                value="off-plan" 
                className="nav-link px-8 py-3 rounded-none data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:border-accent border border-transparent transition-all duration-300"
              >
                {t("featuredProperties.offPlan")}
              </TabsTrigger>
              <TabsTrigger 
                value="ready" 
                className="nav-link px-8 py-3 rounded-none data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:border-accent border border-transparent transition-all duration-300"
              >
                {t("featuredProperties.ready")}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Off-Plan Properties */}
          <TabsContent value="off-plan" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <PropertySkeleton key={i} />
                ))}
              </div>
            ) : offPlanProperties.length === 0 ? (
              <div className="text-center py-16 border border-border rounded-lg">
                <p className="text-muted-foreground text-lg mb-4">
                  {t("featuredProperties.noOffPlan")}
                </p>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offPlanProperties.slice(0, 6).map((property) => (
                  <StaggerItem key={property.id}>
                    <PropertyCard property={property} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            
            {offPlanProperties.length > 0 && (
              <div className="text-center mt-10">
                <Button asChild variant="luxury" size="lg" className="px-10">
                  <Link to="/off-plan">
                    {t("featuredProperties.viewAllOffPlan")}
                    <ArrowRight className="h-4 w-4 ms-2 rtl-flip" strokeWidth={1} />
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Ready Properties */}
          <TabsContent value="ready" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <PropertySkeleton key={i} />
                ))}
              </div>
            ) : readyProperties.length === 0 ? (
              <div className="text-center py-16 border border-border rounded-lg">
                <p className="text-muted-foreground text-lg mb-4">
                  {t("featuredProperties.noReady")}
                </p>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readyProperties.slice(0, 6).map((property) => (
                  <StaggerItem key={property.id}>
                    <PropertyCard property={property} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            
            {readyProperties.length > 0 && (
              <div className="text-center mt-10">
                <Button asChild variant="luxury" size="lg" className="px-10">
                  <Link to="/ready">
                    {t("featuredProperties.viewAllReady")}
                    <ArrowRight className="h-4 w-4 ms-2 rtl-flip" strokeWidth={1} />
                  </Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default FeaturedProperties;
