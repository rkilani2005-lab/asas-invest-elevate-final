import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Hero = () => {
  const { t, isRTL } = useLanguage();
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
          <source src="/videos/hero-dubai.mp4" type="video/mp4" />
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
        style={{ y: textY, opacity }}
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
          {t("hero.subtitle")}
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
          {t("hero.headline")} <br className="hidden md:block" />
          <span style={{ color: '#C5A059' }}>{t("hero.headlineHighlight")}</span>
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
          {t("hero.tagline")}
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className={cn(
            "flex flex-col sm:flex-row gap-4 justify-center",
            isRTL && "sm:flex-row-reverse"
          )}
        >
          <Button 
            size="lg" 
            className="px-10 py-6 bg-accent text-white hover:bg-accent/90 font-display uppercase tracking-widest text-xs"
            style={{
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            {t("hero.exploreProperties")}
            <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} strokeWidth={1} />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border border-white/50 text-white hover:bg-white/10 hover:text-white transition-all duration-300 px-10 py-6"
          >
            {t("hero.contactUs")}
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
