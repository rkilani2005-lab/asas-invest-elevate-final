import { Eye, Shield, Users, Sparkles, LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
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

// Map icon names to Lucide components
const getIconComponent = (iconName: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    Eye, Shield, Users, Sparkles,
  };
  
  // Try to get from our map first
  if (iconMap[iconName]) return iconMap[iconName];
  
  // Try to get from all Lucide icons
  const AllIcons = LucideIcons as unknown as Record<string, LucideIcon>;
  if (AllIcons[iconName]) return AllIcons[iconName];
  
  return Eye; // Default fallback
};

const WhyAsas = () => {
  const { t, isRTL, language } = useLanguage();

  // Fetch Why Asas content from database
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

  // Fetch Why Asas values from database
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

  // Use database content with i18n fallback
  const content = {
    subtitle: whyAsasContent?.subtitle || t("whyAsas.subtitle"),
    title: whyAsasContent?.title || t("whyAsas.title"),
    description: whyAsasContent?.description || t("whyAsas.description"),
    mission: whyAsasContent?.mission || t("whyAsas.mission"),
    missionAuthor: whyAsasContent?.missionAuthor || t("whyAsas.missionAuthor"),
  };

  // Default values from i18n
  const defaultValues = [
    {
      icon: Eye,
      title: t("whyAsas.values.freshVision.title"),
      description: t("whyAsas.values.freshVision.description")
    },
    {
      icon: Shield,
      title: t("whyAsas.values.uaeExpertise.title"),
      description: t("whyAsas.values.uaeExpertise.description")
    },
    {
      icon: Users,
      title: t("whyAsas.values.clientFocused.title"),
      description: t("whyAsas.values.clientFocused.description")
    },
    {
      icon: Sparkles,
      title: t("whyAsas.values.transparent.title"),
      description: t("whyAsas.values.transparent.description")
    }
  ];

  // Use database values or fallback to defaults
  const values = valuesData?.map(v => ({
    icon: getIconComponent(v.icon),
    title: v.title,
    description: v.description
  })) || defaultValues;

  return (
    <section id="about" className="py-24 bg-card grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8 relative z-10", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">
            {content.subtitle}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-accent mb-6">
            {content.title}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {content.description}
          </p>
        </ScrollReveal>

        {/* Values Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const IconComponent = value.icon;
            return (
              <StaggerItem key={index}>
                <div className="group text-center p-8 bg-white border border-accent/30 hover:border-accent transition-all duration-300 h-full shadow-card">
                  <div className="inline-flex items-center justify-center w-14 h-14 border border-accent/30 rounded-lg mb-6 group-hover:border-accent transition-colors duration-300">
                    <IconComponent className="h-6 w-6 text-accent" strokeWidth={1} />
                  </div>
                  <h3 className="heading-section text-xl text-accent mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Mission Statement */}
        <ScrollReveal delay={0.3} className="mt-20 max-w-4xl mx-auto text-center">
          <div className="border border-accent/30 p-10 md:p-14 bg-white shadow-card">
            <blockquote className="font-serif text-xl md:text-2xl text-foreground leading-relaxed italic">
              "{content.mission}"
            </blockquote>
            <div className="divider-gold my-6 max-w-24 mx-auto" />
            <p className="text-accent text-xs tracking-widest uppercase">
              {content.missionAuthor}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhyAsas;
