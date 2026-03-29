import { Key, Building2, ShoppingBag, LineChart, FileSearch, Briefcase } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Services = () => {
  const { t, isRTL } = useLanguage();

  const services = [
    {
      icon: Key,
      titleKey: "services.items.leasing.title",
      descriptionKey: "services.items.leasing.description"
    },
    {
      icon: Building2,
      titleKey: "services.items.management.title",
      descriptionKey: "services.items.management.description"
    },
    {
      icon: ShoppingBag,
      titleKey: "services.items.acquisitions.title",
      descriptionKey: "services.items.acquisitions.description"
    },
    {
      icon: LineChart,
      titleKey: "services.items.advisory.title",
      descriptionKey: "services.items.advisory.description"
    },
    {
      icon: FileSearch,
      titleKey: "services.items.valuation.title",
      descriptionKey: "services.items.valuation.description"
    },
    {
      icon: Briefcase,
      titleKey: "services.items.portfolio.title",
      descriptionKey: "services.items.portfolio.description"
    }
  ];

  return (
    <section id="services" className="py-24 bg-secondary/30">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">
            {t("services.subtitle")}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-foreground mb-6">
            {t("services.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("services.description")}
          </p>
        </ScrollReveal>

        {/* Services Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <StaggerItem key={index}>
              <div className="group bg-card rounded-xl p-8 border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-elegant h-full">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-6 group-hover:bg-accent/20 transition-colors duration-300">
                  <service.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="heading-section text-xl text-foreground mb-3">
                    {t(service.titleKey)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(service.descriptionKey)}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Services;
