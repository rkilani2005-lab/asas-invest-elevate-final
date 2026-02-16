import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const { isRTL } = useLanguage();

  function toggleGroup(label: string) {
    setOpenGroup(openGroup === label ? null : label);
  }

  return (
    <div className="flex flex-col space-y-1">
      {menuGroups.map((group) => (
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
              onClick={(e) => onLinkClick(e, group.href!)}
            >
              {group.label}
            </a>
          ) : (
            <>
              <button
                className={cn(
                  "w-full nav-link py-3 px-3 rounded-lg transition-colors duration-200 flex items-center justify-between",
                  openGroup === group.label
                    ? "text-accent bg-accent/5"
                    : "text-foreground/70 hover:text-accent hover:bg-accent/5"
                )}
                onClick={() => toggleGroup(group.label)}
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openGroup === group.label && "rotate-180"
                  )}
                  strokeWidth={1.5}
                />
              </button>

              {openGroup === group.label && group.items && (
                <div className="py-1 pl-4">
                  {group.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "block py-2.5 px-3 rounded-lg text-sm transition-colors duration-200 cursor-pointer",
                        location.pathname === item.href
                          ? "text-accent font-medium"
                          : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                      )}
                      onClick={(e) => onLinkClick(e, item.href)}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
