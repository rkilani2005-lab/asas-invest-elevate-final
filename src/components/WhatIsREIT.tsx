import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const WhatIsREIT = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
  const badgeY = useTransform(scrollYProgress, [0, 1], ["20%", "-20%"]);

  const benefits = [
    "Access to premium real estate without full ownership costs",
    "Professionally managed portfolio of diversified assets",
    "Regular income potential from rental yields",
    "Liquidity compared to traditional property ownership",
    "Transparent and regulated investment structure"
  ];

  return (
    <section className="py-24 bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image Side with Parallax */}
          <ScrollReveal direction="left">
            <div ref={ref} className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <motion.img
                  src="/images/dubai-skyline.jpg"
                  alt="Dubai Skyline"
                  className="w-full h-[120%] object-cover"
                  style={{ y: imageY }}
                />
              </div>
              <motion.div 
                className="absolute -bottom-6 -end-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-elegant hidden md:blockck"
                style={{ y: badgeY }}
              >
                <div className="font-serif text-3xl font-bold">10+</div>
                <div className="text-primary-foreground/80 text-sm">Years of Excellence</div>
              </motion.div>
            </div>
          </ScrollReveal>

          {/* Content Side */}
          <div className="lg:ps-8">
            <ScrollReveal direction="right">
              <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
                Real Estate Investment
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
                What is Real Estate Investment?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Real estate investment involves purchasing property assets to generate income 
                through rental yields or capital appreciation. In the UAE, this offers unique 
                advantages including tax-free returns, strong rental markets, and world-class 
                infrastructure.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                At Asas Invest, we help investors navigate Dubai's dynamic property market, 
                offering access to premium residential, commercial, and hospitality assets 
                with professional management and transparent processes.
              </p>
            </ScrollReveal>

            <StaggerContainer className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <StaggerItem key={index}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <ScrollReveal delay={0.4}>
              <Link to="/insights">
                <Button variant="outline" className="group">
                  Learn More
                  <ArrowRight className="ms-2 h-4 w-4 group-hover:translate-x-1 transition-transform rtl-flip" />
                </Button>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsREIT;
