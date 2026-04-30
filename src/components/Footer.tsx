import { Instagram, Linkedin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import logoBlackBg from "@/assets/logo-black-bg.jpeg";
import { cn } from "@/lib/utils";

const Footer = () => {
  const { t, isRTL } = useLanguage();

  const footerColumns = [
    {
      title: t("nav.buy"),
      links: [
        { name: t("nav.buyReady"), href: "/ready" },
        { name: t("nav.buyOffPlan"), href: "/off-plan" },
        { name: t("nav.buyCommercial"), href: "/commercial" },
        { name: t("nav.buyGuide"), href: "/buy/guide" },
      ],
    },
    {
      title: t("nav.invest"),
      links: [
        { name: t("nav.investAdvisory"), href: "/invest" },
        { name: t("nav.investVisa"), href: "/invest#golden-visa" },
        { name: t("nav.investCalculator"), href: "/invest#calculator" },
      ],
    },
    {
      title: t("nav.aboutAsas"),
      links: [
        { name: t("nav.aboutVision"), href: "/about" },
        { name: t("nav.insights"), href: "/insights" },
        { name: t("nav.sellValuation"), href: "/sell" },
      ],
    },
  ];

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/asas.invest.real.estate", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: MessageCircle, href: "https://wa.me/971500000000", label: "WhatsApp" }
  ];

  return (
    <footer
      className={cn("py-16 grain-overlay", isRTL && "font-arabic")}
      style={{ backgroundColor: '#111111', color: '#fff' }}
    >
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-6">
              <img
                src={logoBlackBg}
                alt="Asas Invest Real Estate"
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="mb-6 max-w-sm text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {t("footer.aboutText")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300"
                  style={{
                    border: '0.5px solid rgba(197,160,89,0.3)',
                    color: 'rgba(255,255,255,0.5)'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#C5A059';
                    (e.currentTarget as HTMLElement).style.color = '#C5A059';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(197,160,89,0.3)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                  }}
                >
                  <social.icon className="h-4 w-4" strokeWidth={1} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3
                className="mb-5 text-xs"
                style={{ color: '#C5A059', fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}
              >
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm transition-colors duration-300"
                      style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#C5A059')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.45)')}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mb-8" style={{ height: '1px', background: 'rgba(197,160,89,0.2)' }} />

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {t("footer.copyright")}
          </p>
          <p className="text-xs text-center md:text-end" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {t("footer.address")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
