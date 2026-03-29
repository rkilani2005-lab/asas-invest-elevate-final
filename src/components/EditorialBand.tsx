import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const EditorialBand = () => {
  const { t, isRTL } = useLanguage();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Subtle parallax on the background image
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const stats = [
    { value: "0%", label: t("editorial.stat1") || "Property Tax" },
    { value: "6–9%", label: t("editorial.stat2") || "Avg. Rental Yield" },
    { value: "#1", label: t("editorial.stat3") || "Safe City Index" },
  ];

  return (
    <section
      ref={ref}
      className={cn("relative overflow-hidden", isRTL && "font-arabic")}
      style={{ height: "380px" }}
    >
      {/* Parallax background image */}
      <motion.div
        className="absolute inset-0 scale-110"
        style={{ y: backgroundY }}
      >
        <img
          src="/images/dubai-skyline.jpg"
          alt="Dubai skyline"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark overlay — deeper at top and bottom, lighter in center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.55) 45%, rgba(10,10,10,0.75) 100%)",
        }}
      />

      {/* Gold top rule */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(197,160,89,0.5), transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
        {/* Pull quote */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="heading-hero italic mb-10 max-w-2xl"
          style={{
            fontSize: "clamp(1.4rem, 2.8vw, 2rem)",
            fontWeight: 300,
            color: "#FFFFFF",
            lineHeight: 1.45,
            letterSpacing: "-0.01em",
          }}
        >
          "The world's smartest{" "}
          <span style={{ color: "#C5A059" }}>tax-free</span> real estate market."
        </motion.p>

        {/* Inline stat chips */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
        >
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="heading-hero"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  color: "#C5A059",
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
              <span
                className="text-xs uppercase"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.12em",
                  maxWidth: "80px",
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </span>
              {i < stats.length - 1 && (
                <div
                  className="hidden md:block"
                  style={{
                    width: "1px",
                    height: "28px",
                    background: "rgba(197,160,89,0.25)",
                    marginInlineStart: "8px",
                  }}
                />
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Gold bottom rule */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "1px",
          background:
            "linear-gradient(to right, transparent, rgba(197,160,89,0.5), transparent)",
        }}
      />
    </section>
  );
};

export default EditorialBand;
