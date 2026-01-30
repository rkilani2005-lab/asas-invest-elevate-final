import { Eye, Shield, Users, Sparkles } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const WhyAsas = () => {
  const { t, isRTL } = useLanguage();

  const values = [
    {
      icon: Eye,
      titleKey: "whyAsas.values.freshVision.title",
      descriptionKey: "whyAsas.values.freshVision.description"
    },
    {
      icon: Shield,
      titleKey: "whyAsas.values.uaeExpertise.title",
      descriptionKey: "whyAsas.values.uaeExpertise.description"
    },
    {
      icon: Users,
      titleKey: "whyAsas.values.clientFocused.title",
      descriptionKey: "whyAsas.values.clientFocused.description"
    },
    {
      icon: Sparkles,
      titleKey: "whyAsas.values.transparent.title",
      descriptionKey: "whyAsas.values.transparent.description"
    }
  ];

  return (
    <section id="about" className="py-24 bg-background">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            {t("whyAsas.subtitle")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            {t("whyAsas.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("whyAsas.description")}
          </p>
        </ScrollReveal>

        {/* Values Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <StaggerItem key={index}>
              <div className="group text-center p-8 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-300 h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-background rounded-xl mb-6 group-hover:bg-accent/10 transition-colors duration-300">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-3">
                  {t(value.titleKey)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(value.descriptionKey)}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Mission Statement */}
        <ScrollReveal delay={0.3} className="mt-20 max-w-4xl mx-auto text-center">
          <div className="bg-primary/5 rounded-2xl p-10 md:p-14">
            <blockquote className="font-serif text-xl md:text-2xl text-foreground leading-relaxed italic">
              "{t("whyAsas.mission")}"
            </blockquote>
            <p className="mt-6 text-muted-foreground text-sm tracking-wide">
              {t("whyAsas.missionAuthor")}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhyAsas;
