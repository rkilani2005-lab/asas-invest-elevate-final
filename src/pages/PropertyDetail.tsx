import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Heart } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead, { propertyJsonLd, breadcrumbJsonLd } from "@/components/SEOHead";
import PropertyHero from "@/components/property-detail/PropertyHero";
import PropertyOverview from "@/components/property-detail/PropertyOverview";
import PropertyLocation from "@/components/property-detail/PropertyLocation";
import PropertyAmenities from "@/components/property-detail/PropertyAmenities";
import PropertyGallery from "@/components/property-detail/PropertyGallery";
import PropertyFloorPlans from "@/components/property-detail/PropertyFloorPlans";
import PropertyPaymentPlan from "@/components/property-detail/PropertyPaymentPlan";
import PropertyInquiry from "@/components/property-detail/PropertyInquiry";
import PropertyBrochures from "@/components/property-detail/PropertyBrochures";
import PropertyStickyTabs, { TabConfig } from "@/components/property-detail/PropertyStickyTabs";
import PropertyTabContent from "@/components/property-detail/PropertyTabContent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type PropertyWithRelations = Tables<"properties"> & {
  media: Tables<"media">[];
  amenities: Tables<"amenities">[];
  payment_milestones: Tables<"payment_milestones">[];
};

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, isRTL, language } = useLanguage();
  
  // Get initial tab from URL or default to "overview"
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch property data
  const { data: property, isLoading, error } = useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          media(*),
          amenities(*),
          payment_milestones(*)
        `)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Property not found");
      return data as PropertyWithRelations;
    },
    enabled: !!slug,
  });

  // Check for content availability
  const hasFloorPlans = property?.media.some(m => m.type === "floorplan" || m.type === "floor_plate") ?? false;
  const hasBrochures = property?.media.some(m => m.type === "brochure") ?? false;
  const hasGalleryImages = property?.media.filter(m => m.type === "render" || m.type === "interior").length > 0 || property?.media.some(m => m.type === "video") || !!property?.video_url;

  // Build tabs based on available content
  const tabs: TabConfig[] = property ? [
    { id: "overview", label: t("sections.overview"), show: true },
    { id: "location", label: t("sections.location"), show: true },
    { id: "amenities", label: t("sections.amenities"), show: property.amenities.length > 0 },
    { id: "floorPlans", label: t("sections.floorPlans"), show: hasFloorPlans },
    { id: "paymentPlan", label: t("sections.paymentPlan"), show: property.payment_milestones.length > 0 },
    { id: "gallery", label: t("sections.gallery"), show: hasGalleryImages },
    { id: "brochures", label: language === "ar" ? "الكتيبات" : "Brochures", show: hasBrochures },
    { id: "inquire", label: t("sections.inquire"), show: true },
  ] : [];

  const tabContentRef = useRef<HTMLDivElement>(null);

  // Update URL when tab changes and scroll content into view
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
    // Scroll so the tab content is visible just below the sticky tabs
    setTimeout(() => {
      tabContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Sync with URL param changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      const validTabs = tabs.filter(t => t.show).map(t => t.id);
      if (validTabs.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      }
    }
  }, [searchParams, tabs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20">
          <Skeleton className="h-[60vh] w-full bg-secondary" />
          <div className="container mx-auto px-4 py-12 space-y-8">
            <Skeleton className="h-12 w-1/2 bg-secondary" />
            <Skeleton className="h-6 w-3/4 bg-secondary" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 bg-secondary" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-20 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">
            Property Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/">
            <Button variant="luxury">Return Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const name = language === "ar" && property.name_ar ? property.name_ar : property.name_en;
  const tagline = language === "ar" && property.tagline_ar ? property.tagline_ar : property.tagline_en;

  // SEO data
  const heroImage = property.media?.find((m) => m.type === "hero" || m.type === "render")?.url;
  const seoDescription = (property.overview_en || property.tagline_en || `${property.name_en} - ${property.type === "ready" ? "Ready" : "Off-Plan"} property in ${property.location_en || "Dubai"}`)
    .replace(/<[^>]*>/g, "").slice(0, 155);

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <SEOHead
        title={`${property.name_en}${property.location_en ? ` | ${property.location_en}` : ""} | Asas Invest`}
        description={seoDescription}
        canonical={`https://asasinvest.com/property/${slug}`}
        ogImage={heroImage}
        ogType="product"
        jsonLd={[
          propertyJsonLd({
            name: property.name_en || "",
            slug: slug || "",
            description: seoDescription,
            image: heroImage,
            priceRange: property.price_range || undefined,
            location: property.location_en || undefined,
            type: property.type || undefined,
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "https://asasinvest.com" },
            { name: property.type === "ready" ? "Ready Properties" : "Off-Plan", url: `https://asasinvest.com/${property.type === "ready" ? "ready" : "off-plan"}` },
            { name: property.name_en || "" },
          ]),
        ]}
      />
      <Navigation />

      {/* Hero Section */}
      <PropertyHero property={property} />

      {/* Sticky Tabs Navigation */}
      <PropertyStickyTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={tabs}
      />

      {/* Main Content */}
      <main className={cn("pb-20 relative z-10", isRTL && "font-arabic")}>
        {/* Back Button & Actions */}
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <Link
              to={property.type === "off-plan" ? "/off-plan" : "/ready"}
              className={cn(
                "flex items-center text-muted-foreground hover:text-accent transition-colors",
                isRTL && "flex-row-reverse"
              )}
            >
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} strokeWidth={1} />
              <span className="text-sm">{t("property.type." + property.type.replace("-", ""))}</span>
            </Link>
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" className="gap-2 border-accent/30 text-foreground hover:border-accent">
                <Share2 className="h-4 w-4" strokeWidth={1} />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-accent/30 text-foreground hover:border-accent">
                <Heart className="h-4 w-4" strokeWidth={1} />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="container mx-auto px-4 lg:px-8 pb-8">
          <div className={cn("max-w-4xl", isRTL && "text-right mr-auto ml-0")}>
            <p className="text-accent text-xs font-medium tracking-widest uppercase mb-2">
              {language === "ar" && property.developer_ar ? property.developer_ar : property.developer_en}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium text-accent mb-4">
              {name}
            </h1>
            {tagline && (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {tagline}
              </p>
            )}
          </div>
        </div>

        {/* Tab Content - No page scroll, just component swap */}
        <div ref={tabContentRef} className="min-h-[50vh] scroll-mt-24">
          <PropertyTabContent activeTab={activeTab} tabId="overview">
            <PropertyOverview property={property} />
          </PropertyTabContent>

          <PropertyTabContent activeTab={activeTab} tabId="location">
            <PropertyLocation property={property} />
          </PropertyTabContent>

          {property.amenities.length > 0 && (
            <PropertyTabContent activeTab={activeTab} tabId="amenities">
              <PropertyAmenities property={property} />
            </PropertyTabContent>
          )}

          {hasFloorPlans && (
            <PropertyTabContent activeTab={activeTab} tabId="floorPlans">
              <PropertyFloorPlans property={property} />
            </PropertyTabContent>
          )}

          {property.payment_milestones.length > 0 && (
            <PropertyTabContent activeTab={activeTab} tabId="paymentPlan">
              <PropertyPaymentPlan property={property} />
            </PropertyTabContent>
          )}

          {hasGalleryImages && (
            <PropertyTabContent activeTab={activeTab} tabId="gallery">
              <PropertyGallery property={property} />
            </PropertyTabContent>
          )}

          {hasBrochures && (
            <PropertyTabContent activeTab={activeTab} tabId="brochures">
              <PropertyBrochures property={property} />
            </PropertyTabContent>
          )}

          <PropertyTabContent activeTab={activeTab} tabId="inquire">
            <PropertyInquiry property={property} />
          </PropertyTabContent>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PropertyDetail;
