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
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4 lg:px-8">
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
                className="h-14 w-14 rounded-full object-cover"
              />
            </div>
            <p className="text-primary-foreground/70 mb-6 max-w-sm text-sm leading-relaxed">
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
                  className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all duration-300"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="nav-link mb-4">{t("footer.about")}</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="nav-link mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 pt-8">
          <div className={cn(
            "flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0",
            isRTL && "md:flex-row-reverse"
          )}>
            <p className="text-primary-foreground/50 text-xs">
              {t("footer.copyright")}
            </p>
            <p className={cn(
              "text-primary-foreground/50 text-xs text-center",
              isRTL ? "md:text-left" : "md:text-right"
            )}>
              {t("footer.address")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
