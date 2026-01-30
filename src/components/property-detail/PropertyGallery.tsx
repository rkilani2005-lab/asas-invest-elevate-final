import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyGalleryProps {
  property: Tables<"properties"> & {
    media: Tables<"media">[];
  };
}

const PropertyGallery = ({ property }: PropertyGalleryProps) => {
  const { t, isRTL, language } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filter and categorize media
  const allMedia = property.media.filter(m => 
    m.type === "render" || m.type === "interior" || m.type === "hero"
  );
  const interiors = property.media.filter(m => m.type === "interior");
  const renders = property.media.filter(m => m.type === "render" || m.type === "hero");
  const materials = property.media.filter(m => m.type === "material");

  const tabs = [
    { id: "all", label: "All", items: allMedia },
    { id: "renders", label: "Renders", items: renders },
    { id: "interiors", label: "Interiors", items: interiors },
    { id: "materials", label: "Materials", items: materials },
  ].filter(tab => tab.items.length > 0);

  const currentMedia = tabs.find(t => t.id === activeTab)?.items || allMedia;

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % currentMedia.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + currentMedia.length) % currentMedia.length);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") isRTL ? prevImage() : nextImage();
    if (e.key === "ArrowLeft") isRTL ? nextImage() : prevImage();
  };

  if (allMedia.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-card">
      <div className="container mx-auto px-4 lg:px-8">
        <div className={cn(
          "flex flex-col md:flex-row md:items-center md:justify-between mb-8",
          isRTL && "md:flex-row-reverse"
        )}>
          <h2 className={cn(
            "heading-section text-2xl md:text-3xl text-foreground mb-4 md:mb-0",
            isRTL && "text-right"
          )}>
            {t("sections.gallery")}
          </h2>

          {/* Tabs */}
          {tabs.length > 1 && (
            <div className={cn(
              "flex gap-1 border border-border p-1",
              isRTL && "flex-row-reverse"
            )}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium tracking-wider uppercase transition-all duration-300",
                    activeTab === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label} ({tab.items.length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentMedia.map((item, index) => {
            const caption = language === "ar" && item.caption_ar ? item.caption_ar : item.caption_en;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-[4/3] overflow-hidden border border-border cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={item.url}
                  alt={caption || `Gallery image ${index + 1}`}
                  className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={1} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/98 flex items-center justify-center"
              onClick={closeLightbox}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-50 w-12 h-12 border border-border rounded-full flex items-center justify-center hover:border-accent transition-colors"
              >
                <X className="h-6 w-6 text-foreground" strokeWidth={1} />
              </button>

              {/* Navigation */}
              {currentMedia.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); isRTL ? nextImage() : prevImage(); }}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 z-50 w-12 h-12 border border-border rounded-full flex items-center justify-center hover:border-accent transition-colors",
                      isRTL ? "right-4" : "left-4"
                    )}
                  >
                    <ChevronLeft className={cn("h-6 w-6 text-foreground", isRTL && "rotate-180")} strokeWidth={1} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); isRTL ? prevImage() : nextImage(); }}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 z-50 w-12 h-12 border border-border rounded-full flex items-center justify-center hover:border-accent transition-colors",
                      isRTL ? "left-4" : "right-4"
                    )}
                  >
                    <ChevronRight className={cn("h-6 w-6 text-foreground", isRTL && "rotate-180")} strokeWidth={1} />
                  </button>
                </>
              )}

              {/* Image */}
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-[90vw] max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={currentMedia[currentIndex].url}
                  alt={`Gallery image ${currentIndex + 1}`}
                  className="max-w-full max-h-[85vh] object-contain"
                />
              </motion.div>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground text-sm tracking-wider">
                {currentIndex + 1} / {currentMedia.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PropertyGallery;
