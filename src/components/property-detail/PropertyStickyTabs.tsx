import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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
    <div className="sticky top-20 z-40 bg-background/98 backdrop-blur-md border-b border-accent/20 grain-overlay">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
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
                  "nav-link px-5 py-4 whitespace-nowrap transition-all duration-300 border-b-2 -mb-[1px] relative",
                  activeTab === tab.id
                    ? "text-accent border-accent font-medium"
                    : "text-foreground/70 hover:text-accent border-transparent hover:border-accent/30"
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
