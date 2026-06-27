import { useQuery } from "@tanstack/react-query";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import ViewAllButton from "@/components/ui/view-all-button";
import SpotlightCard from "@/components/spotlight/SpotlightCard";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Spotlight } from "@/lib/spotlightVideo";

type SpotlightRow = Spotlight & { properties?: { slug: string } | null };

const SpotlightSection = () => {
  const { t, isRTL } = useLanguage();

  const { data: spotlights } = useQuery({
    queryKey: ["spotlights", "home"],
    queryFn: async () => {
      // The table may not exist yet (manual migration) — fail soft to [].
      try {
        const { data, error } = await (supabase as any)
          .from("spotlights")
          .select("*, properties(slug)")
          .eq("is_published", true)
          .order("sort_order", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(4);
        if (error) return [] as SpotlightRow[];
        return (data || []) as SpotlightRow[];
      } catch {
        return [] as SpotlightRow[];
      }
    },
  });

  // Self-hide when there's nothing to show.
  if (!spotlights || spotlights.length === 0) return null;

  const featured = spotlights.find((s) => s.is_featured) || spotlights[0];
  const recent = spotlights.filter((s) => s.id !== featured.id).slice(0, 3);

  return (
    <section className="py-24 bg-background grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        <ScrollReveal className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-eyebrow text-accent mb-3">{t("home.spotlight.eyebrow")}</p>
              <h2 className="heading-section text-3xl md:text-5xl text-foreground">{t("home.spotlight.title")}</h2>
            </div>
            <ViewAllButton to="/spotlight" variant="inline" className="self-start md:self-end" />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Featured (≈60%) */}
            <div className="lg:col-span-3">
              <SpotlightCard spotlight={featured} surface="home" propertySlug={featured.properties?.slug} variant="featured" />
            </div>

            {/* Recent list (≈40%) */}
            {recent.length > 0 && (
              <div className="lg:col-span-2 flex flex-col gap-6">
                {recent.map((s) => (
                  <SpotlightCard key={s.id} spotlight={s} surface="home" propertySlug={s.properties?.slug} variant="compact" />
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default SpotlightSection;
