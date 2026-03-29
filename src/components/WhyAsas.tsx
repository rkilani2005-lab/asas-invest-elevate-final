import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WhyAsasContent {
  subtitle?: string;
  title?: string;
  description?: string;
  mission?: string;
  missionAuthor?: string;
}

interface ValueItem {
  icon: string;
  title: string;
  description: string;
}

const WhyAsas = () => {
  const { t, isRTL, language } = useLanguage();

  const { data: whyAsasContent } = useQuery({
    queryKey: ['pages_content', 'home', 'why_asas', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages_content')
        .select('content_en, content_ar')
        .eq('page_slug', 'home')
        .eq('section_key', 'why_asas')
        .maybeSingle();
      if (error || !data) return null;
      return (language === 'ar' ? data.content_ar : data.content_en) as WhyAsasContent;
    },
  });

  const { data: valuesData } = useQuery({
    queryKey: ['pages_content', 'home', 'why_asas_values', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages_content')
        .select('content_en, content_ar')
        .eq('page_slug', 'home')
        .eq('section_key', 'why_asas_values')
        .maybeSingle();
      if (error || !data) return null;
      const content = language === 'ar' ? data.content_ar : data.content_en;
      if (!Array.isArray(content)) return null;
      return content as unknown as ValueItem[];
    },
  });

  const content = {
    subtitle: whyAsasContent?.subtitle || t("whyAsas.subtitle"),
    title: whyAsasContent?.title || t("whyAsas.title"),
    description: whyAsasContent?.description || t("whyAsas.description"),
    mission: whyAsasContent?.mission || t("whyAsas.mission"),
    missionAuthor: whyAsasContent?.missionAuthor || t("whyAsas.missionAuthor"),
  };

  const defaultValues = [
    { title: t("whyAsas.values.freshVision.title"),   description: t("whyAsas.values.freshVision.description") },
    { title: t("whyAsas.values.uaeExpertise.title"),  description: t("whyAsas.values.uaeExpertise.description") },
    { title: t("whyAsas.values.clientFocused.title"), description: t("whyAsas.values.clientFocused.description") },
    { title: t("whyAsas.values.transparent.title"),   description: t("whyAsas.values.transparent.description") },
  ];

  const values = valuesData?.map(v => ({
    title: v.title,
    description: v.description,
  })) || defaultValues;

  return (
    <section id="about" className={cn("py-24 bg-card grain-overlay", isRTL && "font-arabic")}>
      <div className="container mx-auto px-4 lg:px-8">

        {/* Asymmetric two-column layout: header left, values right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-24 items-start mb-20">

          {/* Left — editorial header, sticky on desktop */}
          <ScrollReveal className="lg:col-span-2 lg:sticky lg:top-32">
            <p className="text-eyebrow text-accent mb-5" style={{ letterSpacing: '0.15em' }}>
              {content.subtitle}
            </p>
            <h2
              className="heading-section mb-6"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', lineHeight: 1.1, color: '#1A1A1A' }}
            >
              {content.title}
            </h2>
            {/* Gold rule */}
            <div style={{ width: '48px', height: '1px', background: '#C5A059', marginBottom: '1.5rem' }} />
            <p className="text-muted-foreground leading-relaxed" style={{ fontSize: '0.95rem' }}>
              {content.description}
            </p>
          </ScrollReveal>

          {/* Right — stacked editorial value cards, no icon boxes */}
          <div className="lg:col-span-3">
            <StaggerContainer className="flex flex-col divide-y">
              {values.map((value, index) => (
                <StaggerItem key={index}>
                  <div
                    className="group py-8 flex gap-6 items-start cursor-default"
                    style={{ borderColor: 'rgba(197,160,89,0.15)' }}
                  >
                    {/* Thin gold left border with number */}
                    <div className="flex-shrink-0 flex flex-col items-center pt-1">
                      <span
                        className="text-xs font-medium mb-2"
                        style={{
                          color: 'rgba(197,160,89,0.5)',
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: '0.06em',
                        }}
                      >
                        0{index + 1}
                      </span>
                      <div
                        className="w-px flex-1 min-h-[40px]"
                        style={{ background: 'rgba(197,160,89,0.25)' }}
                      />
                    </div>
                    {/* Text content */}
                    <div className="flex-1 pb-2">
                      <h3
                        className="heading-section mb-2 transition-colors duration-300"
                        style={{
                          fontSize: '1.2rem',
                          color: '#1A1A1A',
                          fontWeight: 600,
                        }}
                      >
                        {value.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>

        {/* Mission Statement — full-width, left-aligned, editorial */}
        <ScrollReveal delay={0.2}>
          <div
            className="relative px-10 md:px-16 py-12 md:py-14 overflow-hidden"
            style={{
              borderInlineStart: '2px solid #C5A059',
              background: 'rgba(197,160,89,0.04)',
            }}
          >
            <blockquote
              className="heading-section italic mb-6"
              style={{
                fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
                color: '#1A1A1A',
                fontWeight: 400,
                lineHeight: 1.5,
                maxWidth: '48rem',
              }}
            >
              "{content.mission}"
            </blockquote>
            <p
              className="text-xs uppercase tracking-widest"
              style={{
                color: '#C5A059',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.14em',
              }}
            >
              {content.missionAuthor}
            </p>
          </div>
        </ScrollReveal>

      </div>
    </section>
  );
};

export default WhyAsas;
