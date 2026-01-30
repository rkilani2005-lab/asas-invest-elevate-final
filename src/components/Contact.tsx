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
    <section id="contact" className="py-24 bg-background">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            {t("contact.title")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            {t("contact.subtitle")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("contact.subtitle")}
          </p>
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
                    "bg-secondary/50 rounded-xl p-5 flex items-start group hover:bg-secondary transition-all duration-300 block",
                    isRTL ? "flex-row-reverse space-x-reverse space-x-4 text-right" : "space-x-4"
                  )}
                >
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors duration-300">
                    <info.icon className="h-5 w-5 text-accent" />
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
            <div className="bg-secondary/50 rounded-xl p-8 h-full">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className={cn(
                      "block text-sm font-medium text-foreground mb-2",
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
                        "bg-background border-border focus:border-accent transition-colors",
                        isRTL && "text-right"
                      )}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className={cn(
                      "block text-sm font-medium text-foreground mb-2",
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
                        "bg-background border-border focus:border-accent transition-colors",
                        isRTL && "text-right"
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className={cn(
                    "block text-sm font-medium text-foreground mb-2",
                    isRTL && "text-right"
                  )}>
                    {t("contact.phone")}
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    className={cn(
                      "bg-background border-border focus:border-accent transition-colors",
                      isRTL && "text-right"
                    )}
                  />
                </div>
                <div>
                  <label htmlFor="message" className={cn(
                    "block text-sm font-medium text-foreground mb-2",
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
                      "bg-background border-border focus:border-accent transition-colors resize-none",
                      isRTL && "text-right"
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 text-sm font-medium tracking-wide"
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
