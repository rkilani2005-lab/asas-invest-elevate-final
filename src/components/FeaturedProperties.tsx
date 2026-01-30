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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-10 w-full mt-4" />
      </div>
    </div>
  );

  return (
    <section id="properties" className="py-24 bg-background">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-eyebrow text-accent mb-4">
            {t("featuredProperties.subtitle")}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-foreground mb-6">
            {t("featuredProperties.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("featuredProperties.description")}
          </p>
        </ScrollReveal>

        {/* Property Tabs */}
        <Tabs defaultValue="off-plan" className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="bg-secondary/50 p-1 rounded-full">
              <TabsTrigger 
                value="off-plan" 
                className="nav-link px-6 py-2.5 rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {t("featuredProperties.offPlan")}
              </TabsTrigger>
              <TabsTrigger 
                value="ready" 
                className="nav-link px-6 py-2.5 rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
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
              <div className="text-center py-16 bg-secondary/30 rounded-2xl">
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
                <Button asChild variant="outline" size="lg" className="nav-link border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                  <Link to="/off-plan">
                    {t("featuredProperties.viewAllOffPlan")}
                    <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />
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
              <div className="text-center py-16 bg-secondary/30 rounded-2xl">
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
                <Button asChild variant="outline" size="lg" className="nav-link border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                  <Link to="/ready">
                    {t("featuredProperties.viewAllReady")}
                    <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />
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
