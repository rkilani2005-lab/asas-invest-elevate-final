import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Contact = () => {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t("contact.success"),
      description: t("contact.success"),
    });
  };

  const contactInfo = [
    {
      icon: Phone,
      titleKey: "contact.phone",
      details: "+971 4 XXX XXXX",
      link: "tel:+97140000000"
    },
    {
      icon: MessageCircle,
      titleKey: "contact.whatsapp",
      details: "+971 50 XXX XXXX",
      link: "https://wa.me/971500000000"
    },
    {
      icon: Mail,
      titleKey: "contact.email",
      details: "info@asasinvest.ae",
      link: "mailto:info@asasinvest.ae"
    },
    {
      icon: MapPin,
      titleKey: "footer.address",
      details: "Business Bay, Dubai, UAE",
      link: "#"
    }
  ];

  return (
    <section id="contact" className="py-24 bg-background grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8 relative z-10", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">
            {t("contact.title")}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-accent mb-6">
            {t("contact.subtitle")}
          </h2>
        </ScrollReveal>

        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto",
          isRTL && "lg:flex-row-reverse"
        )}>
          {/* Contact Info */}
          <StaggerContainer className="space-y-4">
            {contactInfo.map((info, index) => (
              <StaggerItem key={index}>
                <a
                  href={info.link}
                  target={info.link.startsWith("http") ? "_blank" : undefined}
                  rel={info.link.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={cn(
                    "border border-accent/30 p-5 flex items-start group hover:border-accent transition-all duration-300 block bg-white shadow-card",
                    isRTL ? "flex-row-reverse space-x-reverse space-x-4 text-right" : "space-x-4"
                  )}
                >
                  <div className="w-10 h-10 border border-accent/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-accent transition-colors duration-300">
                    <info.icon className="h-5 w-5 text-accent" strokeWidth={1} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm mb-0.5">{t(info.titleKey)}</div>
                    <div className="text-muted-foreground text-sm">{info.details}</div>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Contact Form */}
          <ScrollReveal direction={isRTL ? "left" : "right"} className="lg:col-span-2">
            <div className="bg-white border border-accent/30 p-8 h-full shadow-card">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className={cn(
                      "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                      isRTL && "text-right"
                    )}>
                      {t("contact.name")}
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("contact.name")}
                      required
                      className={cn(
                        "bg-white border-accent/30 focus:border-accent transition-colors rounded-none text-foreground",
                        isRTL && "text-right"
                      )}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={cn(
                      "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                      isRTL && "text-right"
                    )}>
                      {t("contact.email")}
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      className={cn(
                        "bg-white border-accent/30 focus:border-accent transition-colors rounded-none text-foreground",
                        isRTL && "text-right"
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className={cn(
                    "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                    isRTL && "text-right"
                  )}>
                    {t("contact.phone")}
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    className={cn(
                      "bg-white border-accent/30 focus:border-accent transition-colors rounded-none text-foreground",
                      isRTL && "text-right"
                    )}
                  />
                </div>
                <div>
                  <label htmlFor="message" className={cn(
                    "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider",
                    isRTL && "text-right"
                  )}>
                    {t("contact.message")}
                  </label>
                  <Textarea
                    id="message"
                    placeholder={t("contact.message")}
                    rows={4}
                    required
                    className={cn(
                      "bg-white border-accent/30 focus:border-accent transition-colors resize-none rounded-none text-foreground",
                      isRTL && "text-right"
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  variant="luxury"
                  className="w-full rounded-none"
                >
                  {t("buttons.submit")}
                </Button>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
