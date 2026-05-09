import { useState } from "react";
import { Send, CheckCircle2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface PropertyInquiryProps {
  property: Tables<"properties">;
}

const PropertyInquiry = ({ property }: PropertyInquiryProps) => {
  const { t, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    interests: [] as string[],
  });

  const interestOptions = [
    { id: "floorPlans", label: t("contact.floorPlan") },
    { id: "brochure", label: t("contact.brochure") },
    { id: "vipPack", label: t("contact.vipPack") },
  ];

  const handleInterestChange = (interest: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      interests: checked
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("inquiries").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        message: formData.message || null,
        interests: formData.interests,
        property_id: property.id,
        inquiry_type: "property",
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: t("contact.success"),
        description: t("contact.success"),
      });
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyName = language === "ar" && property.name_ar ? property.name_ar : property.name_en;

  if (isSubmitted) {
    return (
    <div className="py-12 bg-card border-y border-accent/20">
      <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center py-12 bg-white border border-accent/30 shadow-card"
          >
            <div className="w-20 h-20 border border-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={1} />
            </div>
            <h3 className="font-serif text-2xl font-medium text-foreground mb-4">
              {t("contact.success")}
            </h3>
            <p className="text-muted-foreground mb-6">
              Our team will review your inquiry about {propertyName} and get back to you shortly.
            </p>
            <Button
              variant="luxury"
              onClick={() => setIsSubmitted(false)}
            >
              Submit Another Inquiry
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-background border-y border-accent/20">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        )}>
          {/* Left - Info */}
          <div className={cn(isRTL && "text-end lg:order-2")}>
            <p className="text-accent text-xs font-medium tracking-widest uppercase mb-4">
              {t("sections.inquire")}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-accent mb-6">
              Interested in {propertyName}?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Our investment advisors are ready to help you explore this opportunity. 
              Fill out the form and we'll get back to you within 24 hours.
            </p>

            {/* WhatsApp Option */}
            <div className={cn(
              "flex items-center gap-4 p-4 border border-accent/30 bg-white shadow-card"
            )}>
              <div className="w-12 h-12 border border-accent/30 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-accent" strokeWidth={1} />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Prefer WhatsApp?</p>
                <a
                  href={`https://wa.me/971500000000?text=I'm interested in ${encodeURIComponent(propertyName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline text-sm"
                >
                  {t("contact.whatsapp")} →
                </a>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className={cn("lg:order-1", isRTL && "lg:order-1")}>
            <form onSubmit={handleSubmit} className="bg-white border border-accent/30 p-8 space-y-5 shadow-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={cn(
                    "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                    isRTL && "text-end"
                  )}>
                    {t("contact.name")} *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={cn(
                      "bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
                      isRTL && "text-end"
                    )}
                    placeholder={t("contact.name")}
                  />
                </div>
                <div>
                  <label className={cn(
                    "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                    isRTL && "text-end"
                  )}>
                    {t("contact.email")} *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={cn(
                      "bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
                      isRTL && "text-end"
                    )}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className={cn(
                  "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                  isRTL && "text-end"
                )}>
                  {t("contact.phone")}
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className={cn(
                    "bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
                    isRTL && "text-end"
                  )}
                  placeholder="+971 XX XXX XXXX"
                />
              </div>

              <div>
                <label className={cn(
                  "block text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider",
                  isRTL && "text-end"
                )}>
                  {t("contact.interests")}
                </label>
                <div className={cn(
                  "flex flex-wrap gap-4"
                )}>
                  {interestOptions.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer"
                      )}
                    >
                      <Checkbox
                        checked={formData.interests.includes(option.id)}
                        onCheckedChange={(checked) => handleInterestChange(option.id, checked as boolean)}
                        className="border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent rounded-none"
                      />
                      <span className="text-sm text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={cn(
                  "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                  isRTL && "text-end"
                )}>
                  {t("contact.message")}
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className={cn(
                    "bg-white border-accent/30 rounded-none focus:border-accent resize-none text-foreground",
                    isRTL && "text-end"
                  )}
                  rows={4}
                  placeholder="Tell us about your investment goals..."
                />
              </div>

              <Button
                type="submit"
                size="lg"
                variant="luxury"
                disabled={isSubmitting}
                className="w-full rounded-none"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    {t("buttons.registerInterest")}
                    <Send className={cn("h-4 w-4", isRTL ? "me-2" : "ms-2")} strokeWidth={1} />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyInquiry;
