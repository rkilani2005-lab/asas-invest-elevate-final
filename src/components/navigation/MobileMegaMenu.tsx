import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useMegaMenuItems } from "./MegaMenu";

interface MobileMegaMenuProps {
  onLinkClick: (e: React.MouseEvent, href: string) => void;
}

export default function MobileMegaMenu({ onLinkClick }: MobileMegaMenuProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const menuGroups = useMegaMenuItems();
  const location = useLocation();
  const { t } = useLanguage();

  function toggleGroup(label: string) {
    setOpenGroup(openGroup === label ? null : label);
  }

  return (
    <nav
      aria-label={t("navigation.primaryMenuLabel", "Primary")}
      className="flex flex-col space-y-1"
    >
      {menuGroups.map((group) => {
        const isOpen = openGroup === group.label;
        const submenuId = `mobile-submenu-${group.label.replace(/\s+/g, "-")}`;
        return (
          <div key={group.label}>
            {group.href ? (
              <a
                href={group.href}
                className={cn(
                  "nav-link py-3 px-3 rounded-lg transition-colors duration-200 cursor-pointer block",
                  location.pathname === group.href
                    ? "text-accent bg-accent/5 font-medium"
                    : "text-foreground/70 hover:text-accent hover:bg-accent/5"
                )}
                aria-current={location.pathname === group.href ? "page" : undefined}
                onClick={(e) => onLinkClick(e, group.href!)}
              >
                {group.label}
              </a>
            ) : (
              <>
                <button
                  type="button"
                  className={cn(
                    "w-full nav-link py-3 px-3 rounded-lg transition-colors duration-200 flex items-center justify-between",
                    isOpen
                      ? "text-accent bg-accent/5"
                      : "text-foreground/70 hover:text-accent hover:bg-accent/5"
                  )}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  aria-controls={submenuId}
                  aria-label={t(
                    isOpen ? "navigation.collapseSubmenu" : "navigation.expandSubmenu",
                    { label: group.label, defaultValue: `${isOpen ? "Collapse" : "Expand"} ${group.label} submenu` }
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && group.items && (
                  <div id={submenuId} className="py-1 ps-4">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "block py-2.5 px-3 rounded-lg text-sm transition-colors duration-200 cursor-pointer",
                            isActive
                              ? "text-accent font-medium"
                              : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                          )}
                          aria-current={isActive ? "page" : undefined}
                          onClick={(e) => onLinkClick(e, item.href)}
                        >
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
