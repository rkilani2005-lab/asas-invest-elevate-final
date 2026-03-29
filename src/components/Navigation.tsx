import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import MegaMenu from "@/components/navigation/MegaMenu";
import MobileMegaMenu from "@/components/navigation/MobileMegaMenu";
import logoWhiteBg from "@/assets/logo-white-bg.png";
import logoBlackBg from "@/assets/logo-black-bg.jpeg";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const isDarkHeroPage = location.pathname === "/" || location.pathname.startsWith("/property/");
  
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMobileLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      if (href.startsWith("#") || href.includes("/#")) {
        window.location.href = href;
      } else {
        navigate(href);
      }
    }, 300);
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
      <div className="w-full px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img 
              src={logoWhiteBg} 
              alt="Asas Invest Real Estate" 
              className="h-[41px] w-auto object-contain transition-all duration-300"
            />
          </Link>

          {/* Desktop Mega Menu - Centered */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <MegaMenu
              navTextClass={navTextClass}
              activeNavClass={activeNavClass}
              navStyle={navStyle}
              isDarkHeroPage={isDarkHeroPage}
              isScrolled={isScrolled}
            />
          </div>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-x-4 shrink-0">
            <LanguageSwitcher isDarkBackground={!isScrolled && isDarkHeroPage} />
            <Link to="/#contact">
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
            </Link>
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60] lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
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
                <div className="flex items-center justify-between h-20 px-6 border-b border-border">
                  <Link to="/" onClick={(e) => handleMobileLinkClick(e, '/')} className="flex items-center">
                    <img 
                      src={logoWhiteBg} 
                      alt="Asas Invest" 
                      className="h-10 w-auto object-contain"
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

                <div className="flex-1 overflow-y-auto py-6 px-6">
                  <MobileMegaMenu onLinkClick={handleMobileLinkClick} />
                </div>

                <div className="px-6 py-6 border-t border-border space-y-4">
                  <div className="flex justify-start">
                    <LanguageSwitcher />
                  </div>
                  <Button variant="luxury" className="w-full" onClick={(e) => handleMobileLinkClick(e as any, '/#contact')}>
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
