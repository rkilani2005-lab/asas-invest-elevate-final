import { Instagram, Linkedin, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import asasLogo from "@/assets/asas-logo.jpg";
import { cn } from "@/lib/utils";

const Footer = () => {
  const { t, isRTL } = useLanguage();

  const footerLinks = {
    company: [
      { name: t("nav.about"), href: "#about" },
      { name: t("nav.insights"), href: "#insights" },
    ],
    services: [
      { name: t("nav.offPlan"), href: "#properties" },
      { name: t("nav.ready"), href: "#properties" },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/asas.invest.real.estate", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: MessageCircle, href: "https://wa.me/971500000000", label: "WhatsApp" }
  ];

  return (
    <footer className="bg-card text-foreground py-16 border-t border-border grain-overlay">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12",
          isRTL && "text-right"
        )}>
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className={cn(
              "flex items-center mb-4",
              isRTL ? "space-x-reverse space-x-3 justify-end md:justify-start" : "space-x-3"
            )}>
              <img 
                src={asasLogo} 
                alt="Asas Invest Real Estate" 
                className="h-14 w-14 rounded-full object-cover border border-accent/30"
              />
            </div>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
              {t("footer.aboutText")}
            </p>
            <div className={cn(
              "flex",
              isRTL ? "space-x-reverse space-x-3 justify-end md:justify-start" : "space-x-3"
            )}>
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 border border-border rounded-lg flex items-center justify-center hover:border-accent hover:text-accent transition-all duration-300"
                >
                  <social.icon className="h-4 w-4" strokeWidth={1} />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="nav-link text-accent mb-4">{t("footer.about")}</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-accent text-sm transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="nav-link text-accent mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-accent text-sm transition-colors duration-300"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Gold divider */}
        <div className="divider-gold mb-8" />

        {/* Bottom Bar */}
        <div className={cn(
          "flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0",
          isRTL && "md:flex-row-reverse"
        )}>
          <p className="text-muted-foreground text-xs">
            {t("footer.copyright")}
          </p>
          <p className={cn(
            "text-muted-foreground text-xs text-center",
            isRTL ? "md:text-left" : "md:text-right"
          )}>
            {t("footer.address")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
