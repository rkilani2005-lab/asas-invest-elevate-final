import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  href: string;
  description?: string;
}

interface MenuGroup {
  label: string;
  items?: MenuItem[];
  href?: string;
}

export function useMegaMenuItems() {
  const { t } = useLanguage();

  const menuGroups: MenuGroup[] = [
    {
      label: t("nav.buy"),
      items: [
        { label: t("nav.buyReady"), href: "/ready", description: t("nav.buyReadyDesc") },
        { label: t("nav.buyOffPlan"), href: "/off-plan", description: t("nav.buyOffPlanDesc") },
        { label: t("nav.buyCommercial"), href: "/commercial", description: t("nav.buyCommercialDesc") },
        { label: t("nav.buyGuide"), href: "/buy/guide", description: t("nav.buyGuideDesc") },
      ],
    },
    {
      label: t("nav.sell"),
      items: [
        { label: t("nav.sellValuation"), href: "/sell", description: t("nav.sellValuationDesc") },
        { label: t("nav.sellList"), href: "/sell#list", description: t("nav.sellListDesc") },
      ],
    },
    {
      label: t("nav.invest"),
      items: [
        { label: t("nav.investAdvisory"), href: "/invest", description: t("nav.investAdvisoryDesc") },
        { label: t("nav.investVisa"), href: "/invest#golden-visa", description: t("nav.investVisaDesc") },
        { label: t("nav.investCalculator"), href: "/invest#calculator", description: t("nav.investCalculatorDesc") },
        { label: t("nav.investWhy"), href: "/invest#why-dubai", description: t("nav.investWhyDesc") },
      ],
    },
    {
      label: t("nav.insights"),
      href: "/insights",
    },
    {
      label: t("nav.aboutAsas"),
      items: [
        { label: t("nav.aboutVision"), href: "/about", description: t("nav.aboutVisionDesc") },
        { label: t("nav.aboutOffice"), href: "/about#private-office", description: t("nav.aboutOfficeDesc") },
        { label: t("nav.aboutCareers"), href: "/about/careers", description: t("nav.aboutCareersDesc") },
      ],
    },
  ];

  return menuGroups;
}

interface MegaMenuProps {
  navTextClass: string;
  activeNavClass: string;
  navStyle?: React.CSSProperties;
  isDarkHeroPage: boolean;
  isScrolled: boolean;
}

export default function MegaMenu({ navTextClass, activeNavClass, navStyle, isDarkHeroPage, isScrolled }: MegaMenuProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuGroups = useMegaMenuItems();
  const location = useLocation();
  const { isRTL } = useLanguage();

  // Close on route change
  useEffect(() => { setOpenMenu(null); }, [location.pathname]);

  function handleMouseEnter(label: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenu(label);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setOpenMenu(null), 200);
  }

  function isGroupActive(group: MenuGroup) {
    if (group.href) return location.pathname === group.href;
    return group.items?.some(item => location.pathname === item.href);
  }

  return (
    <div className="hidden lg:flex items-center gap-x-6">
      {menuGroups.map((group) => (
        <div
          key={group.label}
          className="relative"
          onMouseEnter={() => group.items && handleMouseEnter(group.label)}
          onMouseLeave={handleMouseLeave}
        >
          {group.href ? (
            <Link
              to={group.href}
              className={cn(
                "nav-link transition-colors duration-300 flex items-center gap-1 py-2",
                isGroupActive(group) ? activeNavClass : navTextClass
              )}
              style={navStyle}
            >
              {group.label}
            </Link>
          ) : (
            <button
              className={cn(
                "nav-link transition-colors duration-300 flex items-center gap-1 py-2",
                isGroupActive(group) ? activeNavClass : navTextClass
              )}
              style={navStyle}
            >
              {group.label}
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                openMenu === group.label && "rotate-180"
              )} strokeWidth={1.5} />
            </button>
          )}

          {/* Dropdown Panel */}
          {group.items && openMenu === group.label && (
            <div
              className="absolute top-full pt-2 z-50 start-0
              onMouseEnter={() => handleMouseEnter(group.label)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="bg-card border border-accent/30 shadow-lg min-w-[280px] p-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "block px-4 py-3 transition-colors duration-200 hover:bg-accent/5 group",
                      location.pathname === item.href && "bg-accent/5"
                    )}
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className={cn(
                      "block text-sm font-medium transition-colors group-hover:text-accent",
                      location.pathname === item.href ? "text-accent" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
