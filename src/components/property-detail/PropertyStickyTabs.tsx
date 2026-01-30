import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyStickyTabsProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  property: Tables<"properties"> & {
    media: Tables<"media">[];
    payment_milestones: Tables<"payment_milestones">[];
  };
}

const PropertyStickyTabs = ({ activeSection, onSectionChange, property }: PropertyStickyTabsProps) => {
  const { t, isRTL } = useLanguage();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Become sticky after hero section
      setIsSticky(window.scrollY > window.innerHeight * 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Build tabs based on available content
  const tabs = [
    { id: "overview", label: t("sections.overview"), always: true },
    { id: "location", label: t("sections.location"), always: true },
    { id: "amenities", label: t("sections.amenities"), always: true },
    { id: "gallery", label: t("sections.gallery"), show: property.media.length > 0 },
    { id: "floorPlans", label: t("sections.floorPlans"), show: property.media.some(m => m.type === "floorplan") },
    { id: "paymentPlan", label: t("sections.paymentPlan"), show: property.payment_milestones.length > 0 },
    { id: "inquire", label: t("sections.inquire"), always: true },
  ].filter(tab => tab.always || tab.show);

  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur-md border-b border-border transition-all duration-300 z-40",
        isSticky ? "fixed top-20 left-0 right-0 shadow-sm" : "relative"
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="overflow-x-auto scrollbar-hide">
          <div className={cn(
            "flex min-w-max",
            isRTL ? "flex-row-reverse" : ""
          )}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSectionChange(tab.id)}
                className={cn(
                  "px-4 py-4 text-sm font-medium whitespace-nowrap transition-all duration-300 border-b-2 -mb-[1px]",
                  activeSection === tab.id
                    ? "text-accent border-accent"
                    : "text-muted-foreground hover:text-foreground border-transparent hover:border-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default PropertyStickyTabs;
