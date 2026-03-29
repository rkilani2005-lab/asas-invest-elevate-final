import { TrendingUp, Shield, PieChart, Building } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const InvestorValue = () => {
  const { t, isRTL } = useLanguage();

  const benefits = [
    {
      icon: TrendingUp,
      titleKey: "investorValue.benefits.roi.title",
      descriptionKey: "investorValue.benefits.roi.description"
    },
    {
      icon: Shield,
      titleKey: "investorValue.benefits.tax.title",
      descriptionKey: "investorValue.benefits.tax.description"
    },
    {
      icon: PieChart,
      titleKey: "investorValue.benefits.diversification.title",
      descriptionKey: "investorValue.benefits.diversification.description"
    },
    {
      icon: Building,
      titleKey: "investorValue.benefits.primeAssets.title",
      descriptionKey: "investorValue.benefits.primeAssets.description"
    }
  ];

  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        )}>
          {/* Left Column - Text */}
          <ScrollReveal direction={isRTL ? "right" : "left"}>
            <div>
              <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
                {t("investorValue.subtitle")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6 leading-tight">
                {t("investorValue.title")}
              </h2>
              <p className="text-primary-foreground/80 text-lg leading-relaxed mb-8">
                {t("investorValue.description")}
              </p>
              <div className={cn(
                "flex flex-wrap gap-4",
                isRTL && "justify-end"
              )}>
                <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                  <span className="text-sm font-medium">{t("investorValue.rentalYields")}</span>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                  <span className="text-sm font-medium">{t("investorValue.propertyTax")}</span>
                </div>
                <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                  <span className="text-sm font-medium">{t("investorValue.goldenVisa")}</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right Column - Benefits Grid */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <StaggerItem key={index}>
                <div className={cn(
                  "bg-primary-foreground/5 rounded-xl p-6 hover:bg-primary-foreground/10 transition-colors duration-300 h-full",
                  isRTL && "text-right"
                )}>
                  <div className={cn(
                    "inline-flex items-center justify-center w-10 h-10 bg-accent/20 rounded-lg mb-4",
                    isRTL && "float-right ml-4"
                  )}>
                    <benefit.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className={isRTL ? "clear-both" : ""}>
                    <h3 className="font-medium text-lg mb-2">
                      {t(benefit.titleKey)}
                    </h3>
                    <p className="text-primary-foreground/70 text-sm leading-relaxed">
                      {t(benefit.descriptionKey)}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
};

export default InvestorValue;
