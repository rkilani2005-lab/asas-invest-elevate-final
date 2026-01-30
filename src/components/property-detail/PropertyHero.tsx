import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyHeroProps {
  property: Tables<"properties"> & {
    media: Tables<"media">[];
  };
}

const PropertyHero = ({ property }: PropertyHeroProps) => {
  const { isRTL } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get hero and render images
  const heroImages = property.media
    .filter((m) => m.type === "hero" || m.type === "render")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const images = heroImages.length > 0 
    ? heroImages 
    : [{ url: "/placeholder.svg", id: "placeholder" }];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden pt-20">
      {/* Image Carousel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img
            src={images[currentIndex].url}
            alt={property.name_en}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={isRTL ? nextImage : prevImage}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors",
              isRTL ? "right-4" : "left-4"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className={cn("h-6 w-6", isRTL && "rotate-180")} />
          </button>
          <button
            onClick={isRTL ? prevImage : nextImage}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors",
              isRTL ? "left-4" : "right-4"
            )}
            aria-label="Next image"
          >
            <ChevronRight className={cn("h-6 w-6", isRTL && "rotate-180")} />
          </button>
        </>
      )}

      {/* Image Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-accent w-6"
                  : "bg-primary-foreground/50 hover:bg-primary-foreground/70"
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Video Button (if video exists) */}
      {property.video_url && (
        <div className={cn(
          "absolute bottom-6 z-10",
          isRTL ? "left-6" : "right-6"
        )}>
          <Button
            variant="secondary"
            className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <Play className="h-4 w-4" />
            Watch Video
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyHero;
