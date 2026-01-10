import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Hero = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
          className="w-full h-[120%] object-cover"
        >
          <source src="/videos/hero-dubai.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-hero-overlay"></div>
      </motion.div>

      {/* Content with Parallax */}
      <motion.div 
        className="relative z-10 container mx-auto px-4 lg:px-8 text-center"
        style={{ y: textY, opacity }}
      >
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-primary-foreground/80 text-sm md:text-base tracking-widest uppercase mb-4"
        >
          Real Estate Investment & Asset Management
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-primary-foreground mb-6 leading-tight"
        >
          Strategic Real Estate <br className="hidden md:block" />
          Investment in the <span className="text-accent">UAE</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-primary-foreground/85 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Building wealth through carefully selected properties in Dubai's most promising locations
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 text-sm font-medium tracking-wide px-8 py-6"
          >
            Explore Properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/60 transition-all duration-300 text-sm font-medium tracking-wide px-8 py-6"
          >
            Contact Us
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
          className="w-[1px] h-16 bg-gradient-to-b from-primary-foreground/0 via-primary-foreground/50 to-primary-foreground/0"
          animate={{ scaleY: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
};

export default Hero;
