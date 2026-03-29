import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

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

const Stats = () => {
  const { t, isRTL, language } = useLanguage();

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

  const content = {
    subtitle: statsContent?.subtitle || t("stats.subtitle"),
    title: statsContent?.title || t("stats.title"),
    description: statsContent?.description || t("stats.description"),
  };

  const defaultStats = [
    { value: "15+",      label: t("stats.propertiesManaged"), suffix: "" },
    { value: "250,000",  label: t("stats.totalSqFt"),         suffix: "+" },
    { value: "AED 500M", label: t("stats.portfolioValue"),    suffix: "+" },
  ];

  const stats = statsData?.map(s => ({
    value: s.value,
    label: s.label,
    suffix: s.suffix || "",
  })) || defaultStats;

  return (
    <section
      className={cn("relative overflow-hidden grain-overlay", isRTL && "font-arabic")}
      style={{ backgroundColor: '#111111' }}
    >
      {/* Subtle top gold rule */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.4), transparent)' }} />

      <div className="container mx-auto px-4 lg:px-8 py-20">
        {/* Section label — minimal, left-aligned */}
        <ScrollReveal>
          <p
            className="text-eyebrow mb-16"
            style={{ color: 'rgba(197,160,89,0.7)', letterSpacing: '0.15em' }}
          >
            {content.subtitle || t("stats.subtitle")}
          </p>
        </ScrollReveal>

        {/* Numbers — full-width horizontal, divided by thin vertical lines */}
        <StaggerContainer
          className={cn(
            "grid gap-0",
            stats.length === 3
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}
        >
          {stats.map((stat, index) => (
            <StaggerItem key={index}>
              <div
                className={cn(
                  "py-10 px-8 text-center md:text-start",
                  index > 0 && "md:border-s"
                )}
                style={{ borderColor: 'rgba(197,160,89,0.15)' }}
              >
                {/* Big number */}
                <div
                  className="heading-hero mb-3"
                  style={{
                    fontSize: 'clamp(2.8rem, 5vw, 4.5rem)',
                    fontWeight: 300,
                    color: '#C5A059',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    fontStyle: 'italic',
                  }}
                >
                  {stat.value}{stat.suffix}
                </div>
                {/* Label */}
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: '0.14em',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Subtle bottom gold rule */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.4), transparent)' }} />
    </section>
  );
};

export default Stats;
