import { useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import ProgressiveImage from "@/components/ui/progressive-image";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyHeroProps {
  property: Tables<"properties"> & {
    media: Tables<"media">[];
  };
}

const PropertyHero = ({ property }: PropertyHeroProps) => {
  const { isRTL } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Get only hero images (not render images)
  const heroImages = property.media
    .filter((m) => m.type === "hero")
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

  // Check if video URL is a direct file or embed (YouTube/Vimeo)
  const isDirectVideo = property.video_url && 
    (property.video_url.includes('.mp4') || 
     property.video_url.includes('supabase') ||
     property.video_url.includes('storage'));

  const isYouTube = property.video_url && 
    (property.video_url.includes('youtube.com') || property.video_url.includes('youtu.be'));

  const isVimeo = property.video_url && property.video_url.includes('vimeo.com');

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
  };

  // Extract Vimeo video ID
  const getVimeoEmbedUrl = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
  };

  return (
    <>
      <div className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden grain-overlay">
        {/* Cinematic Letterbox - Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-20 md:h-24 bg-gradient-to-b from-charcoal via-charcoal/90 to-transparent z-10" />
        
        {/* Cinematic Letterbox - Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-20 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent z-10" />
        
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
            <ProgressiveImage
              src={images[currentIndex].url}
              alt={property.name_en}
              className="w-full h-full object-cover object-center brightness-105 saturate-110"
              loading={currentIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={currentIndex === 0 ? "high" : "auto"}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={isRTL ? nextImage : prevImage}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 border border-accent/50 bg-background/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300",
                isRTL ? "right-4" : "left-4"
              )}
              aria-label="Previous image"
            >
              <ChevronLeft className={cn("h-5 w-5", isRTL && "rotate-180")} strokeWidth={1} />
            </button>
            <button
              onClick={isRTL ? prevImage : nextImage}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 w-12 h-12 border border-accent/50 bg-background/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300",
                isRTL ? "left-4" : "right-4"
              )}
              aria-label="Next image"
            >
              <ChevronRight className={cn("h-5 w-5", isRTL && "rotate-180")} strokeWidth={1} />
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
                  "h-[2px] rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "bg-accent w-8"
                    : "bg-foreground/30 hover:bg-foreground/50 w-4"
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
              variant="luxury"
              className="gap-2"
              onClick={() => setShowVideoModal(true)}
            >
              <Play className="h-4 w-4" strokeWidth={1} />
              Watch Video
            </Button>
          </div>
        )}
      </div>

      {/* Video Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-none overflow-hidden">
          <button
            onClick={() => setShowVideoModal(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
            aria-label="Close video"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          <div className="aspect-video w-full">
            {isDirectVideo && (
              <video
                src={property.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            {isYouTube && (
              <iframe
                src={getYouTubeEmbedUrl(property.video_url!)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Property Video"
              />
            )}
            
            {isVimeo && (
              <iframe
                src={getVimeoEmbedUrl(property.video_url!)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Property Video"
              />
            )}
            
            {!isDirectVideo && !isYouTube && !isVimeo && property.video_url && (
              <video
                src={property.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PropertyHero;
