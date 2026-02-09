import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

        {/* Mobile Slide-in Panel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60] lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              {/* Panel */}
              <motion.div
                initial={{ x: isRTL ? "-100%" : "100%" }}
                animate={{ x: 0 }}
                exit={{ x: isRTL ? "-100%" : "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className={cn(
                  "fixed top-0 bottom-0 w-[300px] z-[70] lg:hidden bg-background shadow-2xl flex flex-col",
                  isRTL ? "left-0" : "right-0"
                )}
              >
                {/* Panel header */}
                <div className={cn(
                  "flex items-center justify-between h-20 px-6 border-b border-border",
                  isRTL && "flex-row-reverse"
                )}>
                  <Link to="/" onClick={handleLinkClick} className="flex items-center">
                    <img 
                      src={asasLogo} 
                      alt="Asas Invest" 
                      className="h-11 w-11 rounded-full object-cover border border-accent/30"
                    />
                  </Link>
                  <button
                    className="p-2 text-foreground hover:text-accent transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Nav links */}
                <div className={cn("flex-1 overflow-y-auto py-6 px-6", isRTL && "direction-rtl")}>
                  <div className="flex flex-col space-y-1">
                    {navLinks.map((link) => (
                      link.isRoute ? (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={cn(
                            "nav-link py-3 px-3 rounded-lg transition-colors duration-200",
                            location.pathname === link.href 
                              ? "text-accent bg-accent/5 font-medium" 
                              : "text-foreground/70 hover:text-accent hover:bg-accent/5",
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
                            "nav-link py-3 px-3 rounded-lg transition-colors duration-200 text-foreground/70 hover:text-accent hover:bg-accent/5",
                            isRTL && "text-right"
                          )}
                          onClick={handleLinkClick}
                        >
                          {link.name}
                        </a>
                      )
                    ))}
                  </div>
                </div>

                {/* Panel footer */}
                <div className="px-6 py-6 border-t border-border space-y-4">
                  <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
                    <LanguageSwitcher />
                  </div>
                  <Button variant="luxury" className="w-full">
                    {t("buttons.contactUs")}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navigation;
