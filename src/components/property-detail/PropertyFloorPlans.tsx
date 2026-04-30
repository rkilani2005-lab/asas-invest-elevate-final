import { useState } from "react";
import { X, Download, Maximize2, FileText, ExternalLink } from "lucide-react";
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

function isPDF(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

const PropertyFloorPlans = ({ property }: PropertyFloorPlansProps) => {
  const { t, isRTL, language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<Tables<"media"> | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Get floor plans and floor plates
  const floorPlans = property.media
    .filter(m => m.type === "floorplan" || m.type === "floor_plate")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  // Separate PDFs and images
  const pdfPlans = floorPlans.filter(p => isPDF(p.url));
  const imagePlans = floorPlans.filter(p => !isPDF(p.url));

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
          isRTL && "text-end"
        )}>
          {t("sections.floorPlans")}
        </h2>

        {/* PDF Floor Plans */}
        {pdfPlans.length > 0 && (
          <div className="mb-8">
            <h3 className={cn(
              "text-lg font-medium text-foreground mb-4",
              isRTL && "text-end"
            )}>
              {language === "ar" ? "مخططات PDF" : "PDF Floor Plans"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfPlans.map((plan, index) => {
                const caption = language === "ar" && plan.caption_ar 
                  ? plan.caption_ar 
                  : plan.caption_en || `Floor Plan ${index + 1}`;
                
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "group bg-secondary/50 rounded-xl border border-border p-4 hover:border-accent/30 hover:shadow-md transition-all duration-300",
                      isRTL && "text-end"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-4"
                    )}>
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {caption}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {plan.type === "floor_plate" 
                            ? (language === "ar" ? "مخطط الطابق" : "Floor Plate") 
                            : (language === "ar" ? "مخطط الوحدة" : "Unit Layout")}
                        </p>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2"
                      )}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          asChild
                        >
                          <a
                            href={plan.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={language === "ar" ? "عرض" : "View"}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          asChild
                        >
                          <a
                            href={plan.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            title={language === "ar" ? "تحميل" : "Download"}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Image Floor Plans Grid */}
        {imagePlans.length > 0 && (
          <>
            {pdfPlans.length > 0 && (
              <h3 className={cn(
                "text-lg font-medium text-foreground mb-4",
                isRTL && "text-end"
              )}>
                {language === "ar" ? "مخططات صور" : "Image Floor Plans"}
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {imagePlans.map((plan, index) => {
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
                        loading="lazy"
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
                      isRTL && "text-end"
                    )}>
                      <p className="font-medium text-foreground mb-1">
                        {caption || `Floor Plan ${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {plan.type === "floor_plate" 
                          ? (language === "ar" ? "مخطط الطابق" : "Floor Plate") 
                          : (language === "ar" ? "مخطط الوحدة" : "Unit Layout")}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Lightbox for Images */}
        <AnimatePresence>
          {lightboxOpen && selectedPlan && !isPDF(selectedPlan.url) && (
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
                className="absolute top-4 end-4 z-50 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colorsrs"
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
                className="absolute top-4 end-20 z-50 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colorsrs"
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
