import { useState, useEffect, useRef } from "react";
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

  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  // Lock body scroll, trap focus, and handle ESC while drawer is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the drawer
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const getFocusable = (): HTMLElement[] => {
      if (!drawerRef.current) return [];
      return Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Tab order is logical (DOM order) — works identically in LTR and RTL
      if (e.shiftKey) {
        if (active === first || !drawerRef.current?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !drawerRef.current?.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the trigger
      menuButtonRef.current?.focus();
    };
  }, [isMobileMenuOpen]);

  // Edge-swipe-to-open: detect a touch that starts within ~24px of the inline-end
  // edge of the viewport and travels inward beyond a threshold. Mirrors automatically
  // for RTL: in LTR start near the right edge and swipe left; in RTL start near the
  // left edge and swipe right.
  useEffect(() => {
    if (isMobileMenuOpen) return;
    if (typeof window === "undefined") return;

    const EDGE_ZONE = 24; // px from the inline-end edge where a swipe may begin
    const OPEN_DISTANCE = 60; // inward travel required to open
    const MAX_VERTICAL_DRIFT = 40; // ignore mostly-vertical swipes

    let startX: number | null = null;
    let startY: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger on mobile viewports where the drawer is reachable
      if (window.innerWidth >= 1024) return;
      const touch = e.touches[0];
      if (!touch) return;
      const fromInlineEnd = isRTL
        ? touch.clientX <= EDGE_ZONE
        : touch.clientX >= window.innerWidth - EDGE_ZONE;
      if (!fromInlineEnd) return;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      if (dy > MAX_VERTICAL_DRIFT) {
        startX = startY = null;
        return;
      }
      // Inward = away from the inline-end edge
      const inwardTravel = isRTL ? dx : -dx;
      if (inwardTravel >= OPEN_DISTANCE) {
        setIsMobileMenuOpen(true);
        startX = startY = null;
      }
    };

    const reset = () => {
      startX = startY = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", reset, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", reset);
      document.removeEventListener("touchcancel", reset);
    };
  }, [isMobileMenuOpen, isRTL]);

  return (
    <nav
      className={cn(
        "fixed top-0 start-0 end-0 z-50 transition-all duration-3000",
        isScrolled 
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg" 
          : "bg-transparent"
      )}
    >
      <div className="w-full px-6 lg:px-10">
        {/* On mobile, force LTR direction so the logo stays on the visual left and the
            hamburger on the visual right in both English and Arabic. Desktop (lg+) inherits
            the document direction so the mega menu mirrors correctly in RTL. */}
        <div className="flex items-center justify-between h-20 [direction:ltr] lg:[direction:inherit]">
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
            ref={menuButtonRef}
            className={cn(
              "lg:hidden p-2 transition-colors duration-300",
              !isScrolled && isDarkHeroPage ? "text-white" : "text-foreground"
            )}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t("buttons.closeMenu", "Close menu") : t("buttons.openMenu", "Open menu")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
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
                aria-hidden="true"
              />
              <motion.div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-label={t("navigation.mobileMenuLabel", "Site navigation")}
                id="mobile-navigation-drawer"
                initial={{ x: isRTL ? "-100%" : "100%" }}
                animate={{ x: 0 }}
                exit={{ x: isRTL ? "-100%" : "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                drag="x"
                dragDirectionLock
                // In LTR the drawer sits on the right, so it can only be dragged rightward (positive x) to close.
                // In RTL it sits on the left, so it can only be dragged leftward (negative x) to close.
                dragConstraints={isRTL ? { left: -300, right: 0 } : { left: 0, right: 300 }}
                dragElastic={{ left: isRTL ? 1 : 0, right: isRTL ? 0 : 1 }}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  const closeThresholdPx = 80;
                  const closeVelocity = 400;
                  // Closing direction is toward the inline-end edge of the viewport.
                  const closedByDistance = isRTL
                    ? info.offset.x < -closeThresholdPx
                    : info.offset.x > closeThresholdPx;
                  const closedByVelocity = isRTL
                    ? info.velocity.x < -closeVelocity
                    : info.velocity.x > closeVelocity;
                  if (closedByDistance || closedByVelocity) {
                    setIsMobileMenuOpen(false);
                  }
                }}
                className={cn(
                  "fixed top-0 bottom-0 w-[300px] z-[70] lg:hidden bg-background shadow-2xl flex flex-col touch-pan-y",
                  // In RTL, anchor to the left so the drawer slides in from the left (inline-end)
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
                    ref={closeButtonRef}
                    className="p-2 text-foreground hover:text-accent transition-colors rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label={t("buttons.closeMenu", "Close menu")}
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
