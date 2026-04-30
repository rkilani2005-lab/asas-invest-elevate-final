import { FileText, Download, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyBrochuresProps {
  property: Tables<"properties"> & {
    media: Tables<"media">[];
  };
}

const PropertyBrochures = ({ property }: PropertyBrochuresProps) => {
  const { t, isRTL, language } = useLanguage();

  // Get brochures
  const brochures = property.media
    .filter(m => m.type === "brochure")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (brochures.length === 0) {
    return null;
  }

  return (
    <div className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "font-serif text-2xl md:text-3xl font-medium text-foreground mb-8",
          isRTL && "text-end"
        )}>
          {language === "ar" ? "الكتيبات والمستندات" : "Brochures & Documents"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brochures.map((brochure, index) => {
            const caption = language === "ar" && brochure.caption_ar 
              ? brochure.caption_ar 
              : brochure.caption_en || "Property Brochure";
            
            return (
              <motion.div
                key={brochure.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "group bg-background rounded-xl border border-border p-6 hover:border-accent/30 hover:shadow-lg transition-all duration-300",
                  isRTL && "text-end"
                )}
              >
                <div className={cn(
                  "flex items-start gap-4"
                )}>
                  {/* PDF Icon */}
                  <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1 line-clamp-2">
                      {caption}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      PDF {language === "ar" ? "مستند" : "Document"}
                    </p>
                    
                    <div className={cn(
                      "flex items-center gap-2"
                    )}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        asChild
                      >
                        <a
                          href={brochure.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {language === "ar" ? "عرض" : "View"}
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <a
                          href={brochure.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          {language === "ar" ? "تحميل" : "Download"}
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PropertyBrochures;
