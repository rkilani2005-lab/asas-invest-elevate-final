import { Building2, LayoutGrid, TrendingUp, LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StatsContent {
  subtitle?: string;
  title?: string;
  description?: string;
}

interface StatItem {
  icon: string;
  value: string;
  label: string;
  suffix?: string;
}

// Map icon names to Lucide components
const getIconComponent = (iconName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    Building2, LayoutGrid, TrendingUp,
  };
  
  if (iconMap[iconName]) return iconMap[iconName];
  
  const AllIcons = LucideIcons as unknown as Record<string, LucideIcon>;
  if (AllIcons[iconName]) return AllIcons[iconName];
  
  return Building2;
};

const Stats = () => {
  const { t, isRTL, language } = useLanguage();

  // Fetch Stats header content from database
  const { data: statsContent } = useQuery({
    queryKey: ['pages_content', 'home', 'stats', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages_content')
        .select('content_en, content_ar')
        .eq('page_slug', 'home')
        .eq('section_key', 'stats')
        .maybeSingle();
      
      if (error || !data) return null;
      return (language === 'ar' ? data.content_ar : data.content_en) as StatsContent;
    },
  });

  // Fetch Stats items from database
  const { data: statsData } = useQuery({
    queryKey: ['pages_content', 'home', 'stats_items', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages_content')
        .select('content_en, content_ar')
        .eq('page_slug', 'home')
        .eq('section_key', 'stats_items')
        .maybeSingle();
      
      if (error || !data) return null;
      const content = language === 'ar' ? data.content_ar : data.content_en;
      if (!Array.isArray(content)) return null;
      return content as unknown as StatItem[];
    },
  });

  // Use database content with i18n fallback
  const content = {
    subtitle: statsContent?.subtitle || t("stats.subtitle"),
    title: statsContent?.title || t("stats.title"),
    description: statsContent?.description || t("stats.description"),
  };

  // Default stats from i18n
  const defaultStats = [
    {
      icon: Building2,
      value: "15+",
      label: t("stats.propertiesManaged"),
      suffix: ""
    },
    {
      icon: LayoutGrid,
      value: "250,000",
      label: t("stats.totalSqFt"),
      suffix: "+"
    },
    {
      icon: TrendingUp,
      value: "AED 500M",
      label: t("stats.portfolioValue"),
      suffix: "+"
    }
  ];

  // Use database stats or fallback to defaults
  const stats = statsData?.map(s => ({
    icon: getIconComponent(s.icon),
    value: s.value,
    label: s.label,
    suffix: s.suffix || ""
  })) || defaultStats;

  return (
    <section className="py-16 bg-background border-y border-accent/20 grain-overlay">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className={cn("text-center mb-12", isRTL && "font-arabic")}>
          <p className="text-eyebrow text-accent mb-4">
            {content.subtitle}
          </p>
          <h2 className="heading-section text-2xl md:text-3xl text-accent">
            {content.title}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            {content.description}
          </p>
        </ScrollReveal>
        
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <StaggerItem key={index}>
                <div className={cn(
                  "text-center p-8 bg-white border border-accent/30 hover:border-accent transition-all duration-300 shadow-card",
                  isRTL && "font-arabic"
                )}>
                  <div className="inline-flex items-center justify-center w-14 h-14 border border-accent/30 rounded-lg mb-4">
                    <IconComponent className="h-6 w-6 text-accent" strokeWidth={1} />
                  </div>
                  <div className="heading-section text-3xl md:text-4xl text-accent mb-2">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-muted-foreground text-xs tracking-widest uppercase">
                    {stat.label}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Stats;
