import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
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
            background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.82) 0%, rgba(10, 10, 10, 0.45) 50%, rgba(10, 10, 10, 0.2) 80%, rgba(10, 10, 10, 0.5) 100%)'
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <span className="pulse-dot" />
          <span
            className="text-eyebrow"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {content.subtitle}
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="heading-hero mb-6 max-w-4xl mx-auto text-white"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          }}
        >
          {content.headline}{' '}
          <span className="accent-underline text-white">{content.headlineHighlight}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-lg mb-10 max-w-2xl mx-auto text-white/75"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {content.tagline}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild size="lg">
            <Link to="/buy">
              {content.exploreProperties}
              <ArrowRight className={cn("h-4 w-4 rtl-flip")} strokeWidth={2} />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/50 text-white hover:bg-white hover:text-charcoal"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {content.contactUs}
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator with Animation */}
      <motion.div 
        className="absolute bottom-8 start-1/2 transform -translate-x-1/2"
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
