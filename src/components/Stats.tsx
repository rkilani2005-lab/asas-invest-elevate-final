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
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <ScrollReveal className={cn("text-center mb-12", isRTL && "font-arabic")}>
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            {t("stats.subtitle")}
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-medium">
            {t("stats.title")}
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-2xl mx-auto">
            {t("stats.description")}
          </p>
        </ScrollReveal>
        
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <StaggerItem key={index}>
              <div className={cn(
                "text-center p-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/15 transition-all duration-300",
                isRTL && "font-arabic"
              )}>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/20 rounded-xl mb-4">
                  <stat.icon className="h-7 w-7 text-accent" />
                </div>
                <div className="font-serif text-3xl md:text-4xl font-bold mb-2">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-primary-foreground/70 text-sm tracking-wide uppercase">
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
