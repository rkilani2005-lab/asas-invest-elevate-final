import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const BuyerGuide = () => {
  const { t, isRTL, language } = useLanguage();

  const { data: content } = useQuery({
    queryKey: ["pages_content", "buyer-guide"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages_content")
        .select("*")
        .eq("page_slug", "buyer-guide")
        .single();
      return data;
    },
  });

  const bodyContent = content
    ? language === "ar" ? (content.content_ar as any)?.body : (content.content_en as any)?.body
    : null;

  return (<>
      <SEOHead
        title="Dubai Property Buyer Guide | Asas Invest"
        description="Step-by-step guide to buying property in Dubai. Costs, legal process, financing options, RERA regulations explained for first-time buyers."
        canonical="https://asasinvest.com/buy/guide"
        jsonLd={breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"Buy",url:"https://asasinvest.com/buy"},{name:"Buyer Guide"}])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8 max-w-3xl", isRTL && "font-arabic")}>
          <ScrollReveal className="text-center mb-12">
            <p className="text-eyebrow text-accent mb-4">{t("buyerGuide.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl text-accent mb-6">{t("buyerGuide.title")}</h1>
          </ScrollReveal>
          {bodyContent ? (
            <div
              className={cn("max-w-none text-muted-foreground leading-relaxed [&_p]:mb-4 [&_h2]:text-accent [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2", isRTL && "text-right")}
              dangerouslySetInnerHTML={{ __html: bodyContent }}
            />
          ) : (
            <div className={cn("text-muted-foreground leading-relaxed space-y-6", isRTL && "text-right")}>
              <p>{t("buyerGuide.intro")}</p>
              <h2 className="heading-section text-xl text-foreground">{t("buyerGuide.step1Title")}</h2>
              <p>{t("buyerGuide.step1Desc")}</p>
              <h2 className="heading-section text-xl text-foreground">{t("buyerGuide.step2Title")}</h2>
              <p>{t("buyerGuide.step2Desc")}</p>
              <h2 className="heading-section text-xl text-foreground">{t("buyerGuide.step3Title")}</h2>
              <p>{t("buyerGuide.step3Desc")}</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default BuyerGuide;
