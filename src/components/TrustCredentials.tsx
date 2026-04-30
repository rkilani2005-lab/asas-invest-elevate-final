import { ShieldCheck, Award, Handshake, Newspaper } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const TrustCredentials = () => {
  const { t, isRTL } = useLanguage();

  const pillars = [
    { icon: ShieldCheck, titleKey: "trust.pillars.licensed.title", descKey: "trust.pillars.licensed.description" },
    { icon: Handshake,   titleKey: "trust.pillars.partners.title", descKey: "trust.pillars.partners.description" },
    { icon: Award,       titleKey: "trust.pillars.awards.title",   descKey: "trust.pillars.awards.description" },
    { icon: Newspaper,   titleKey: "trust.pillars.press.title",    descKey: "trust.pillars.press.description" },
  ];

  const developers = ["EMAAR", "DAMAC", "MERAAS", "SOBHA", "NAKHEEL", "ALDAR"];
  const press = ["FORBES", "BLOOMBERG", "ARABIAN BUSINESS", "GULF NEWS", "THE NATIONAL"];

  return (
    <section
      id="trust"
      className={cn("py-24 bg-card grain-overlay", isRTL && "font-arabic")}
    >
      <div className="container mx-auto px-4 lg:px-8">
        {/* Header */}
        <ScrollReveal className="max-w-3xl mb-16">
          <p
            className="text-eyebrow text-accent mb-5"
            style={{ letterSpacing: "0.15em" }}
          >
            {t("trust.subtitle")}
          </p>
          <h2
            className="heading-section mb-6"
            style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", lineHeight: 1.1, color: "#1A1A1A" }}
          >
            {t("trust.title")}
          </h2>
          <div style={{ width: "48px", height: "1px", background: "#C5A059", marginBottom: "1.5rem" }} />
          <p className="text-muted-foreground leading-relaxed" style={{ fontSize: "0.95rem" }}>
            {t("trust.description")}
          </p>
        </ScrollReveal>

        {/* Pillars grid */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {pillars.map((pillar, index) => (
            <StaggerItem key={index}>
              <div
                className="bg-white p-7 h-full transition-all duration-300 hover:-translate-y-1"
                style={{ border: "1px solid rgba(197,160,89,0.25)" }}
              >
                <div className="inline-flex items-center justify-center w-11 h-11 mb-5" style={{ background: "rgba(197,160,89,0.1)" }}>
                  <pillar.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="heading-section mb-2" style={{ fontSize: "1.05rem", color: "#1A1A1A", fontWeight: 600 }}>
                  {t(pillar.titleKey)}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t(pillar.descKey)}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Developer Partners */}
        <ScrollReveal>
          <p
            className="text-eyebrow text-charcoal/60 mb-6 text-center"
            style={{ letterSpacing: "0.15em" }}
          >
            {t("trust.developerPartners")}
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 pb-10 mb-10"
            style={{ borderBottom: "1px solid rgba(197,160,89,0.2)" }}
          >
            {developers.map((name) => (
              <span
                key={name}
                className="text-charcoal/70 hover:text-charcoal transition-colors duration-300"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  fontSize: "0.9rem",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </ScrollReveal>

        {/* Press */}
        <ScrollReveal delay={0.1}>
          <p
            className="text-eyebrow text-charcoal/60 mb-6 text-center"
            style={{ letterSpacing: "0.15em" }}
          >
            {t("trust.featuredIn")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {press.map((name) => (
              <span
                key={name}
                className="text-charcoal/50 hover:text-charcoal transition-colors duration-300"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  fontSize: "0.8rem",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default TrustCredentials;
