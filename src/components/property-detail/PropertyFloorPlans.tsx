import { useState } from "react";
import { X, ZoomIn, Download, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyFloorPlansProps {
  property: Tables<"properties"> & {
    media: Tables<"media">[];
  };
}

const PropertyFloorPlans = ({ property }: PropertyFloorPlansProps) => {
  const { t, isRTL, language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<Tables<"media"> | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Get floor plans and floor plates
  const floorPlans = property.media
    .filter(m => m.type === "floorplan" || m.type === "floor_plate")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const openLightbox = (plan: Tables<"media">) => {
    setSelectedPlan(plan);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  if (floorPlans.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "font-serif text-2xl md:text-3xl font-medium text-foreground mb-8",
          isRTL && "text-right"
        )}>
          {t("sections.floorPlans")}
        </h2>

        {/* Floor Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floorPlans.map((plan, index) => {
            const caption = language === "ar" && plan.caption_ar ? plan.caption_ar : plan.caption_en;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-secondary/50 rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all duration-300"
              >
                {/* Image */}
                <div 
                  className="relative aspect-square p-6 cursor-pointer"
                  onClick={() => openLightbox(plan)}
                >
                  <img
                    src={plan.url}
                    alt={caption || `Floor plan ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Maximize2 className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className={cn(
                  "p-4 border-t border-border bg-background",
                  isRTL && "text-right"
                )}>
                  <p className="font-medium text-foreground mb-1">
                    {caption || `Floor Plan ${index + 1}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.type === "floor_plate" ? "Floor Plate" : "Unit Layout"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxOpen && selectedPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
              onClick={closeLightbox}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 z-50 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Download Button */}
              <a
                href={selectedPlan.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-20 z-50 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Download className="h-5 w-5 text-white" />
              </a>

              {/* Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-[90vw] max-h-[85vh] bg-white rounded-xl p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedPlan.url}
                  alt={selectedPlan.caption_en || "Floor plan"}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
                {selectedPlan.caption_en && (
                  <p className="text-center mt-4 font-medium text-foreground">
                    {language === "ar" && selectedPlan.caption_ar ? selectedPlan.caption_ar : selectedPlan.caption_en}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PropertyFloorPlans;
