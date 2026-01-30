import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

export interface TabConfig {
  id: string;
  label: string;
  show: boolean;
}

interface PropertyStickyTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: TabConfig[];
}

const PropertyStickyTabs = ({ activeTab, onTabChange, tabs }: PropertyStickyTabsProps) => {
  const { isRTL } = useLanguage();

  const visibleTabs = tabs.filter(tab => tab.show);

  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="overflow-x-auto scrollbar-hide">
          <div className={cn(
            "flex min-w-max",
            isRTL ? "flex-row-reverse" : ""
          )}>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "px-4 py-4 text-sm font-medium whitespace-nowrap transition-all duration-300 border-b-2 -mb-[1px]",
                  activeTab === tab.id
                    ? "text-foreground border-foreground"
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
