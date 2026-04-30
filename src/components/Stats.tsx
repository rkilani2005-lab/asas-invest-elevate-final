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
        {/* Section label — minimal, start-aligned */}
        <ScrollReveal>
          <p
            className="text-eyebrow mb-16"
            style={{ color: 'rgba(197,160,89,0.7)', letterSpacing: '0.15em' }}
          >
            {content.subtitle || t("stats.subtitle")}
          </p>
        </ScrollReveal>

        {/* Tagline pillars — replaces stat numbers */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center gap-6 md:gap-0">
            {[
              t("stats.tagline.item1"),
              t("stats.tagline.item2"),
              t("stats.tagline.item3"),
            ].map((item, index, arr) => (
              <div key={index} className="flex items-center justify-center flex-1">
                <p
                  className="text-center px-6"
                  style={{
                    fontFamily: "'Satoshi', 'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)',
                    color: '#FFFFFF',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.3,
                  }}
                >
                  {item}
                </p>
                {index < arr.length - 1 && (
                  <span
                    className="hidden md:inline-block"
                    style={{
                      width: '1px',
                      height: '40px',
                      background: 'rgba(197,160,89,0.4)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Subtle bottom gold rule */}
      <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(197,160,89,0.4), transparent)' }} />
    </section>
  );
};

export default Stats;
