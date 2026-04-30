import SEOHead, { breadcrumbJsonLd, faqJsonLd } from "@/components/SEOHead";
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
        jsonLd={[
          breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"Buy",url:"https://asasinvest.com/buy"},{name:"Buyer Guide"}]),
          faqJsonLd([
            { question: "How do I buy property in Dubai as a foreigner?", answer: "Foreigners can buy freehold property in designated areas across Dubai. The process involves selecting a property, signing a Memorandum of Understanding (MOU), paying a 10% deposit, obtaining a No Objection Certificate (NOC) from the developer, and completing the transfer at the Dubai Land Department (DLD) with a 4% registration fee." },
            { question: "What are the costs of buying property in Dubai?", answer: "Total buying costs are approximately 7-8% on top of the property price. This includes 4% DLD registration fee, 2% agency commission, AED 580 DLD admin fee, AED 4,200 title deed issuance fee, and conveyancing costs. There is no stamp duty, VAT on resale properties, or annual property tax." },
            { question: "Can I get a mortgage in Dubai as a non-resident?", answer: "Yes, non-residents can obtain mortgages from UAE banks. The maximum loan-to-value (LTV) is typically 50% for non-residents (vs 80% for UAE residents). You will need passport copies, bank statements, salary certificates, and proof of address. Interest rates range from 3-5% for fixed-rate mortgages." },
            { question: "What is the DLD registration fee?", answer: "The Dubai Land Department charges a 4% transfer fee on the property purchase price, split between buyer and seller (typically 2% each, though this is negotiable). This is a one-time fee paid at the time of property transfer registration." },
            { question: "Do I need a residency visa to buy property in Dubai?", answer: "No visa is required to purchase property in Dubai. However, buying property worth AED 750,000 or more qualifies you for a 2-year residency visa, and property worth AED 2 million or more qualifies for the 10-year Golden Visa." },
          ]),
        ]}
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
              className={cn("max-w-none text-muted-foreground leading-relaxed [&_p]:mb-4 [&_h2]:text-accent [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:ps-6 [&_li]:mb-2", isRTL && "text-endht")}
              dangerouslySetInnerHTML={{ __html: bodyContent }}
            />
          ) : (
            <div className={cn("text-muted-foreground leading-relaxed space-y-6", isRTL && "text-endht")}>
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
