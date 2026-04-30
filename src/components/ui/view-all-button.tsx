import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ViewAllButtonProps {
  to: string;
  className?: string;
  /** Inline (text-only with underline) vs. button (pill with border). */
  variant?: "inline" | "button";
  /** Override the default `buttons.viewAll` label. */
  label?: string;
}

/**
 * Shared "View All" / "عرض الكل" CTA used across the site.
 *
 * - Premium Modernist Landmark styling: Inter font, gold accent, charcoal→gold hover.
 * - Pill-shaped (`rounded-full`) when variant="button".
 * - RTL-safe: uses logical `ms-*` spacing and the existing `rtl-flip` utility for the icon.
 * - Aligns naturally inside flex containers (`inline-flex`) with no fixed width — caller controls placement.
 */
const ViewAllButton = ({
  to,
  className,
  variant = "button",
  label,
}: ViewAllButtonProps) => {
  const { t } = useTranslation();
  const text = label ?? t("buttons.viewAll");

  if (variant === "inline") {
    return (
      <Link
        to={to}
        className={cn(
          "inline-flex items-center gap-2 text-sm font-medium",
          "text-charcoal hover:text-accent",
          "border-b border-accent pb-1",
          "transition-colors duration-300",
          "font-sans",
          className
        )}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <span>{text}</span>
        <ArrowRight className="h-4 w-4 rtl-flip" strokeWidth={2} />
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "h-11 px-8 rounded-full",
        "text-sm font-medium tracking-wide whitespace-nowrap",
        "border border-accent text-charcoal bg-transparent",
        "hover:bg-charcoal hover:text-white hover:border-charcoal",
        "transition-all duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        className
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <span>{text}</span>
      <ArrowRight className="h-4 w-4 rtl-flip" strokeWidth={1.75} />
    </Link>
  );
};

export default ViewAllButton;
