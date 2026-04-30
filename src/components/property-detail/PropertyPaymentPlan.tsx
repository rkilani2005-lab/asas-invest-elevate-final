import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyPaymentPlanProps {
  property: Tables<"properties"> & {
    payment_milestones: Tables<"payment_milestones">[];
  };
}

const PropertyPaymentPlan = ({ property }: PropertyPaymentPlanProps) => {
  const { t, isRTL, language } = useLanguage();

  const milestones = property.payment_milestones
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (milestones.length === 0) {
    return null;
  }

  // Calculate cumulative progress for visualization
  let cumulativePercentage = 0;
  const milestonesWithProgress = milestones.map((milestone, index) => {
    cumulativePercentage += milestone.percentage;
    return {
      ...milestone,
      cumulative: cumulativePercentage,
      isLast: index === milestones.length - 1,
    };
  });

  return (
    <div className="py-12 bg-card">
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className={cn(
          "heading-section text-2xl md:text-3xl text-foreground mb-4",
          isRTL && "text-endht"
        )}>
          {t("sections.paymentPlan")}
        </h2>
        <p className={cn(
          "text-muted-foreground mb-10 max-w-2xl",
          isRTL && "text-end me-0 ms-autoto"
        )}>
          Flexible payment structure designed to make your investment journey seamless.
        </p>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="relative h-[2px] bg-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-y-0 start-0 bg-accent
            />
          </div>
          
          {/* Milestone Markers */}
          <div className="relative mt-2">
            {milestonesWithProgress.map((milestone, index) => (
              <div
                key={milestone.id}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${milestone.cumulative}%` }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="w-3 h-3 bg-accent border-2 border-background -mt-[7px]"
                />
                <p className="text-xs text-accent mt-2 whitespace-nowrap font-medium">
                  {milestone.percentage}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Cards */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
          isRTL && "direction-rtl"
        )}>
          {milestonesWithProgress.map((milestone, index) => {
            const milestoneText = language === "ar" && milestone.milestone_ar 
              ? milestone.milestone_ar 
              : milestone.milestone_en;
            
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={cn(
                  "relative border border-border p-6 hover:border-accent/30 transition-all duration-300",
                  isRTL && "text-endht"
                )}
              >
                {/* Step Number */}
                <div className={cn(
                  "absolute -top-3 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 tracking-wider",
                  isRTL ? "end-4-4" : "start-4
                )}>
                  STEP {index + 1}
                </div>

                {/* Percentage */}
                <div className="mt-4 mb-4">
                  <span className="font-serif text-4xl text-accent">
                    {milestone.percentage}
                  </span>
                  <span className="text-2xl text-muted-foreground">%</span>
                </div>

                {/* Milestone Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {milestoneText}
                </p>

                {/* Connector Line (except last) */}
                {!milestone.isLast && (
                  <div className={cn(
                    "hidden lg:block absolute top-1/2 -translate-y-1/2 w-6 h-[1px] bg-border",
                    isRTL ? "-start-6 : "-end-6-6"
                  )} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Summary */}
        <div className={cn(
          "mt-10 p-6 border border-accent/30",
          isRTL && "text-endht"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            isRTL && "flex-row-reverse"
          )}>
            <Check className="h-5 w-5 text-accent flex-shrink-0" strokeWidth={1} />
            <p className="text-foreground font-medium">
              Total payment structure spans from booking to handover, with flexible milestone-based payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPaymentPlan;
