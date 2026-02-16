import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HeroContent {
  subtitle?: string;
  headline?: string;
  headlineHighlight?: string;
  tagline?: string;
  video_url?: string;
  exploreProperties?: string;
  contactUs?: string;
}

const Hero = () => {
  const { t, isRTL, language } = useLanguage();

  // Fetch hero content from database
  const { data: heroContent } = useQuery({
    queryKey: ['pages_content', 'home', 'hero', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages_content')
        .select('content_en, content_ar')
        .eq('page_slug', 'home')
        .eq('section_key', 'hero')
        .maybeSingle();
      
      if (error || !data) return null;
      return (language === 'ar' ? data.content_ar : data.content_en) as HeroContent;
    },
  });

  // Use database content with i18n fallback
  const content = {
    subtitle: heroContent?.subtitle || t("hero.subtitle"),
    headline: heroContent?.headline || t("hero.headline"),
    headlineHighlight: heroContent?.headlineHighlight || t("hero.headlineHighlight"),
    tagline: heroContent?.tagline || t("hero.tagline"),
    video_url: heroContent?.video_url || "/videos/hero-dubai.mp4",
    exploreProperties: heroContent?.exploreProperties || t("hero.exploreProperties"),
    contactUs: heroContent?.contactUs || t("hero.contactUs"),
  };
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay">
      {/* Background Video with Parallax */}
      <motion.div 
        className="absolute inset-0"
        style={{ y: backgroundY }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/dubai-skyline.jpg"
          className="w-full h-[120%] object-cover brightness-105 saturate-110"
        >
          <source src={content.video_url} type="video/mp4" />
        </video>
        {/* Classic Header: Deep Charcoal top-down linear gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(18, 18, 18, 0.75) 0%, rgba(18, 18, 18, 0.4) 40%, rgba(18, 18, 18, 0) 70%)'
          }}
        />
      </motion.div>

      {/* Content with Parallax */}
      <motion.div 
        className={cn(
          "relative z-10 container mx-auto px-4 lg:px-8 text-center",
          isRTL && "font-arabic"
        )}
        style={{ y: textY }}
      >
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-eyebrow mb-4 text-sm md:text-base"
          style={{ 
            color: '#C5A059',
            textShadow: '0px 4px 12px rgba(0, 0, 0, 0.6)'
          }}
        >
          {content.subtitle}
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="heading-hero text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-6"
          style={{ 
            color: '#C5A059',
            textShadow: '0px 4px 12px rgba(0, 0, 0, 0.6)'
          }}
        >
          {content.headline} <br className="hidden md:block" />
          <span style={{ color: '#C5A059' }}>{content.headlineHighlight}</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-white/90"
          style={{ 
            textShadow: '0px 2px 8px rgba(0, 0, 0, 0.5)'
          }}
        >
          {content.tagline}
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            size="lg" 
            className="px-10 py-6 bg-accent text-white hover:bg-accent/90 font-display uppercase tracking-widest text-xs"
            style={{
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            {content.exploreProperties}
            <ArrowRight className={cn("h-4 w-4 rtl-flip", isRTL ? "me-2" : "ms-2")} strokeWidth={1} />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border border-white/50 text-white hover:bg-white/10 hover:text-white transition-all duration-300 px-10 py-6"
          >
            {content.contactUs}
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator with Animation */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1, duration: 0.6 }}
        style={{ opacity }}
      >
        <motion.div 
          className="w-[1px] h-16 bg-gradient-to-b from-accent/0 via-accent/50 to-accent/0"
          animate={{ scaleY: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
};

export default Hero;
