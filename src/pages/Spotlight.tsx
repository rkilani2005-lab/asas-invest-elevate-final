import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import SpotlightCard from "@/components/spotlight/SpotlightCard";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Spotlight } from "@/lib/spotlightVideo";

type SpotlightRow = Spotlight & { properties?: { slug: string } | null };

const SpotlightPage = () => {
  const { t, isRTL } = useLanguage();

  const { data: spotlights, isLoading } = useQuery({
    queryKey: ["spotlights", "archive"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("spotlights")
          .select("*, properties(slug)")
          .eq("is_published", true)
          .order("sort_order", { ascending: false })
          .order("published_at", { ascending: false });
        if (error) return [] as SpotlightRow[];
        return (data || []) as SpotlightRow[];
      } catch {
        return [] as SpotlightRow[];
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t("spotlight.page.title")}
        description={t("spotlight.page.subtitle")}
        canonical="https://asasinvest.com/spotlight"
      />
      <Navigation />
      <main className={cn("pt-32 pb-24", isRTL && "font-arabic")}>
        <div className="container mx-auto px-4 lg:px-8">
          <header className={cn("max-w-2xl mb-12", isRTL && "text-end ms-auto")}>
            <p className="text-eyebrow text-accent mb-3">{t("home.spotlight.eyebrow")}</p>
            <h1 className="heading-section text-4xl md:text-5xl text-foreground mb-4">{t("spotlight.page.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("spotlight.page.subtitle")}</p>
          </header>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-secondary border border-border animate-pulse" style={{ aspectRatio: "16 / 9" }} />
              ))}
            </div>
          ) : !spotlights || spotlights.length === 0 ? (
            <div className="text-center py-16 border border-border">
              <p className="text-muted-foreground text-lg">{t("spotlight.empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {spotlights.map((s) => (
                <SpotlightCard key={s.id} spotlight={s} surface="archive" propertySlug={s.properties?.slug} variant="featured" />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SpotlightPage;
