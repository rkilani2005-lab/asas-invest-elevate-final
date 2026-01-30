import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Heart } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertyHero from "@/components/property-detail/PropertyHero";
import PropertyOverview from "@/components/property-detail/PropertyOverview";
import PropertyLocation from "@/components/property-detail/PropertyLocation";
import PropertyAmenities from "@/components/property-detail/PropertyAmenities";
import PropertyGallery from "@/components/property-detail/PropertyGallery";
import PropertyFloorPlans from "@/components/property-detail/PropertyFloorPlans";
import PropertyPaymentPlan from "@/components/property-detail/PropertyPaymentPlan";
import PropertyInquiry from "@/components/property-detail/PropertyInquiry";
import PropertyStickyTabs from "@/components/property-detail/PropertyStickyTabs";
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
  const { t, isRTL, language } = useLanguage();
  const [activeSection, setActiveSection] = useState("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = Object.entries(sectionRefs.current);
      const scrollPosition = window.scrollY + 200;

      for (const [id, element] of sections) {
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 140; // Account for sticky header + tabs
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const setSectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20">
          <Skeleton className="h-[60vh] w-full" />
          <div className="container mx-auto px-4 py-12 space-y-8">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
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
            <Button>Return Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const name = language === "ar" && property.name_ar ? property.name_ar : property.name_en;
  const tagline = language === "ar" && property.tagline_ar ? property.tagline_ar : property.tagline_en;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <PropertyHero property={property} />

      {/* Sticky Tabs Navigation */}
      <PropertyStickyTabs
        activeSection={activeSection}
        onSectionChange={scrollToSection}
        property={property}
      />

      {/* Main Content */}
      <main className={cn("pb-20", isRTL && "font-arabic")}>
        {/* Back Button & Actions */}
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <Link
              to={property.type === "off-plan" ? "/off-plan" : "/ready"}
              className={cn(
                "flex items-center text-muted-foreground hover:text-foreground transition-colors",
                isRTL && "flex-row-reverse"
              )}
            >
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              <span className="text-sm">{t("property.type." + property.type.replace("-", ""))}</span>
            </Link>
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="container mx-auto px-4 lg:px-8 pb-8">
          <div className={cn("max-w-4xl", isRTL && "text-right mr-auto ml-0")}>
            <p className="text-accent text-sm font-medium tracking-widest uppercase mb-2">
              {language === "ar" && property.developer_ar ? property.developer_ar : property.developer_en}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium text-foreground mb-4">
              {name}
            </h1>
            {tagline && (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {tagline}
              </p>
            )}
          </div>
        </div>

        {/* Sections */}
        <section ref={setSectionRef("overview")} id="overview">
          <PropertyOverview property={property} />
        </section>

        <section ref={setSectionRef("location")} id="location">
          <PropertyLocation property={property} />
        </section>

        <section ref={setSectionRef("amenities")} id="amenities">
          <PropertyAmenities property={property} />
        </section>

        <section ref={setSectionRef("gallery")} id="gallery">
          <PropertyGallery property={property} />
        </section>

        <section ref={setSectionRef("floorPlans")} id="floorPlans">
          <PropertyFloorPlans property={property} />
        </section>

        <section ref={setSectionRef("paymentPlan")} id="paymentPlan">
          <PropertyPaymentPlan property={property} />
        </section>

        <section ref={setSectionRef("inquire")} id="inquire">
          <PropertyInquiry property={property} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PropertyDetail;
