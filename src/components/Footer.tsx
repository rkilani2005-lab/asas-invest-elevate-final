import { Instagram, Linkedin, MessageCircle } from "lucide-react";
import asasLogo from "@/assets/asas-logo.jpg";

const Footer = () => {
  const footerLinks = {
    company: [
      { name: "About Us", href: "#about" },
      { name: "Our Team", href: "#about" },
      { name: "Careers", href: "#" }
    ],
    services: [
      { name: "Property Leasing", href: "#services" },
      { name: "Property Management", href: "#services" },
      { name: "Investment Advisory", href: "#services" }
    ],
    resources: [
      { name: "Market Insights", href: "#insights" },
      { name: "Property Guide", href: "#" },
      { name: "FAQs", href: "#" }
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Disclaimer", href: "#" }
    ]
  };

  const socialLinks = [
    { icon: Instagram, href: "https://www.instagram.com/asas.invest.real.estate", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: MessageCircle, href: "https://wa.me/971500000000", label: "WhatsApp" }
  ];

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={asasLogo} 
                alt="Asas Invest Real Estate" 
                className="h-14 w-14 rounded-full object-cover"
              />
            </div>
            <p className="text-primary-foreground/70 mb-6 max-w-sm text-sm leading-relaxed">
              Strategic real estate investment and asset management services in Dubai and the UAE. 
              Building wealth through carefully selected properties.
            </p>
            <div className="flex space-x-3">
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

          {/* Links */}
          <div>
            <h3 className="font-medium text-sm mb-4 tracking-wide">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4 tracking-wide">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4 tracking-wide">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-4 tracking-wide">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors duration-300 text-sm"
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
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-primary-foreground/50 text-xs">
              © 2026 Asas Invest Real Estate. All rights reserved.
            </p>
            <p className="text-primary-foreground/50 text-xs text-center md:text-right">
              Licensed by Dubai Land Department. Investment services subject to regulatory compliance.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
