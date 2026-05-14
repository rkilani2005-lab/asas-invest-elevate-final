import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small inline marker indicating a piece of text was auto-translated by the
 * AI fallback (translate-content edge function), as opposed to a human
 * translation curated by an admin. Visible to all users; on hover it tooltips
 * the explanation in the active language.
 *
 * Designed to be unobtrusive — same height as surrounding text, subtle gold
 * tint matching the brand accent. Admins can override by editing the AR
 * field in the CMS, which clears the cache row and removes the chip.
 */
export function AutoTranslatedChip({ className }: { className?: string }) {
  const { language } = useLanguage();
  return (
    <span
      title={
        language === "ar"
          ? "ترجمة آلية — يمكن للمسؤولين تحريرها"
          : "Auto-translated — admins can edit"
      }
      className={cn(
        "inline-flex items-center gap-0.5 align-middle ms-1.5",
        "rounded-sm bg-accent/10 px-1 py-px",
        "text-[9px] font-medium uppercase tracking-wider text-accent",
        "select-none",
        className,
      )}
      aria-label="auto-translated"
    >
      <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
      AI
    </span>
  );
}
