import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface BackToTopProps {
  /** Pixels scrolled before the button appears */
  threshold?: number;
  className?: string;
}

const BackToTop = ({ threshold = 400, className }: BackToTopProps) => {
  const [visible, setVisible] = useState(false);
  const { isRTL } = useLanguage();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      type="button"
      size="icon"
      aria-label={isRTL ? "العودة إلى الأعلى" : "Back to top"}
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-elegant",
        "hover:bg-primary/90 transition-all duration-300",
        isRTL ? "left-6" : "right-6",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
        className
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};

export default BackToTop;
