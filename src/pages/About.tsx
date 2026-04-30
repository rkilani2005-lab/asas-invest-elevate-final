import SEOHead, { organizationJsonLd, breadcrumbJsonLd } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { Target, Unlock, Heart } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const pillarIcons = { pillar_precision: Target, pillar_access: Unlock, pillar_stewardship: Heart };

const About = () => {
  const { t, isRTL, language } = useLanguage();

  const { data: sections } = useQuery({
    queryKey: ["page_sections", "about"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_sections")
        .select("*")
        .eq("page_slug", "about")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getSection = (key: string) => sections?.find(s => s.section_key === key);
  const getText = (section: any, field: "title" | "content") => {
    if (!section) return "";
    return language === "ar" ? (section[`${field}_ar`] || section[`${field}_en`]) : section[`${field}_en`];
  };

  const foundersNote = getSection("founders_note");
  const pillars = ["pillar_precision", "pillar_access", "pillar_stewardship"].map(key => getSection(key));

  return (<>
      <SEOHead
        title="About Asas Invest | Dubai Trusted Real Estate Advisors"
        description="Meet the team behind Asas Invest. RERA licensed, strategic property investment and wealth management in Dubai and the UAE."
        canonical="https://asasinvest.com/about"
        jsonLd={[organizationJsonLd, breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"About"}])]}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          {/* Hero */}
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-20">
            <p className="text-eyebrow text-accent mb-4">{t("about.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">{t("about.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("about.heroDesc")}</p>
          </ScrollReveal>

          {/* Philosophy Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-5xl mx-auto">
            {pillars.map((pillar, i) => {
              const key = ["pillar_precision", "pillar_access", "pillar_stewardship"][i] as keyof typeof pillarIcons;
              const Icon = pillarIcons[key];
              return (
                <div key={key} className="card-luxury p-8 text-center hover-lift">
                  <div className="w-14 h-14 border border-accent/30 flex items-center justify-center mx-auto mb-5">
                    <Icon className="h-7 w-7 text-accent" strokeWidth={1} />
                  </div>
                  <h3 className="heading-section text-lg text-foreground mb-3">{getText(pillar, "title")}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{getText(pillar, "content")}</p>
                </div>
              );
            })}
          </div>

          {/* Founder's Note */}
          {foundersNote && (
            <div className="max-w-3xl mx-auto mb-20">
              <ScrollReveal>
                <div className={cn("card-luxury p-10", isRTL && "text-endht")}>
                  <h2 className="heading-section text-xl text-foreground mb-6">{getText(foundersNote, "title")}</h2>
                  <p className="text-muted-foreground leading-relaxed italic text-lg">
                    "{getText(foundersNote, "content")}"
                  </p>
                  <p className="text-accent text-sm mt-4 font-medium">— {t("about.founderName")}</p>
                </div>
              </ScrollReveal>
            </div>
          )}

          {/* The Private Office */}
          <div id="private-office" className="max-w-3xl mx-auto text-center mb-20">
            <ScrollReveal>
              <h2 className="heading-section text-2xl text-foreground mb-4">{t("about.privateOfficeTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t("about.privateOfficeDesc")}</p>
            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default About;
