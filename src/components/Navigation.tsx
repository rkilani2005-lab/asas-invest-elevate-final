import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import asasLogo from "@/assets/asas-logo.jpg";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, isRTL } = useLanguage();
  const location = useLocation();

  // Detect if we're on a page with a dark hero background
  const isDarkHeroPage = location.pathname === "/" || location.pathname.startsWith("/property/");
  
  // Text styling based on scroll state and background
  const navTextClass = !isScrolled && isDarkHeroPage 
    ? "text-white/90 hover:text-white" 
    : "text-foreground/70 hover:text-accent";
  
  const activeNavClass = !isScrolled && isDarkHeroPage
    ? "text-white"
    : "text-accent";
  
  const navStyle = !isScrolled && isDarkHeroPage 
    ? { textShadow: '0px 2px 8px rgba(0, 0, 0, 0.5)' }
    : undefined;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t("nav.home"), href: "/", isRoute: true },
    { name: t("nav.offPlan"), href: "/off-plan", isRoute: true },
    { name: t("nav.ready"), href: "/ready", isRoute: true },
    { name: t("nav.about"), href: location.pathname === "/" ? "#about" : "/#about", isRoute: false },
    { name: t("nav.insights"), href: "/insights", isRoute: true },
    { name: t("nav.contact"), href: location.pathname === "/" ? "#contact" : "/#contact", isRoute: false },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg" 
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className={cn(
          "flex items-center justify-between h-20",
          isRTL && "flex-row-reverse"
        )}>
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={asasLogo} 
              alt="Asas Invest Real Estate" 
              className={cn(
                "h-14 w-14 rounded-full object-cover transition-all duration-300",
                !isScrolled && isDarkHeroPage 
                  ? "border-2 border-white/50" 
                  : "border border-accent/30"
              )}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className={cn(
            "hidden lg:flex items-center",
            isRTL ? "space-x-reverse space-x-8" : "space-x-8"
          )}>
            {navLinks.map((link) => (
              link.isRoute ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "nav-link transition-colors duration-300",
                    location.pathname === link.href ? activeNavClass : navTextClass
                  )}
                  style={navStyle}
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn("nav-link transition-colors duration-300", navTextClass)}
                  style={navStyle}
                >
                  {link.name}
                </a>
              )
            ))}
            <LanguageSwitcher isDarkBackground={!isScrolled && isDarkHeroPage} />
            <Button 
              variant={!isScrolled && isDarkHeroPage ? "outline" : "luxury"} 
              size="sm" 
              className={cn(
                "px-6 transition-all duration-300",
                !isScrolled && isDarkHeroPage && "border-white/50 text-white hover:bg-white/10"
              )}
            >
              {t("buttons.contactUs")}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={cn(
              "lg:hidden p-2 transition-colors duration-300",
              !isScrolled && isDarkHeroPage ? "text-white" : "text-foreground"
            )}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" strokeWidth={1} /> : <Menu className="h-6 w-6" strokeWidth={1} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={cn(
            "lg:hidden py-6 border-t backdrop-blur-md",
            !isScrolled && isDarkHeroPage
              ? "bg-[#121212] border-white/10"
              : "bg-background/98 border-border"
          )}>
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "nav-link py-2 transition-colors duration-300",
                      !isScrolled && isDarkHeroPage
                        ? (location.pathname === link.href ? "text-white" : "text-white/70 hover:text-white")
                        : (location.pathname === link.href ? "text-accent" : "text-foreground/70 hover:text-accent"),
                      isRTL && "text-right"
                    )}
                    onClick={handleLinkClick}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "nav-link py-2 transition-colors duration-300",
                      !isScrolled && isDarkHeroPage
                        ? "text-white/70 hover:text-white"
                        : "text-foreground/70 hover:text-accent",
                      isRTL && "text-right"
                    )}
                    onClick={handleLinkClick}
                  >
                    {link.name}
                  </a>
                )
              ))}
              <div className="pt-4 flex flex-col space-y-3">
                <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
                  <LanguageSwitcher isDarkBackground={!isScrolled && isDarkHeroPage} />
                </div>
                <Button 
                  variant={!isScrolled && isDarkHeroPage ? "outline" : "luxury"} 
                  className={cn(
                    "w-full",
                    !isScrolled && isDarkHeroPage && "border-white/50 text-white hover:bg-white/10"
                  )}
                >
                  {t("buttons.contactUs")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
