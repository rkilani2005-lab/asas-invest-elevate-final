import { Building2, LayoutGrid, TrendingUp } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Stats = () => {
  const { t, isRTL } = useLanguage();

  const stats = [
    {
      icon: Building2,
      value: "15+",
      labelKey: "stats.propertiesManaged",
      suffix: ""
    },
    {
      icon: LayoutGrid,
      value: "250,000",
      labelKey: "stats.totalSqFt",
      suffix: "+"
    },
    {
      icon: TrendingUp,
      value: "AED 500M",
      labelKey: "stats.portfolioValue",
      suffix: "+"
    }
  ];

  return (
    <section className="py-16 bg-background border-y border-accent/20 grain-overlay">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className={cn("text-center mb-12", isRTL && "font-arabic")}>
          <p className="text-eyebrow text-accent mb-4">
            {t("stats.subtitle")}
          </p>
          <h2 className="heading-section text-2xl md:text-3xl text-accent">
            {t("stats.title")}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            {t("stats.description")}
          </p>
        </ScrollReveal>
        
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <StaggerItem key={index}>
              <div className={cn(
                "text-center p-8 bg-white border border-accent/30 hover:border-accent transition-all duration-300 shadow-card",
                isRTL && "font-arabic"
              )}>
                <div className="inline-flex items-center justify-center w-14 h-14 border border-accent/30 rounded-lg mb-4">
                  <stat.icon className="h-6 w-6 text-accent" strokeWidth={1} />
                </div>
                <div className="heading-section text-3xl md:text-4xl text-accent mb-2">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-muted-foreground text-xs tracking-widest uppercase">
                  {t(stat.labelKey)}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Stats;
