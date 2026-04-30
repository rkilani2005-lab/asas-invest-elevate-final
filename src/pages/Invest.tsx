import SEOHead, { breadcrumbJsonLd, faqJsonLd } from "@/components/SEOHead";
import { localizedFaq } from "@/lib/seo-helpers";
import { useState } from "react";
import { TrendingUp, Shield, Award, Globe } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Invest = () => {
  const { t, isRTL } = useLanguage();
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expectedRent, setExpectedRent] = useState("");

  const price = parseFloat(purchasePrice) || 0;
  const rent = parseFloat(expectedRent) || 0;
  const grossROI = price > 0 ? ((rent * 12) / price * 100).toFixed(2) : "0.00";
  const netROI = price > 0 ? (((rent * 12) * 0.85) / price * 100).toFixed(2) : "0.00";

  const valueProps = [
    { icon: TrendingUp, title: t("invest.yieldsTitle"), desc: t("invest.yieldsDesc") },
    { icon: Shield, title: t("invest.appreciationTitle"), desc: t("invest.appreciationDesc") },
    { icon: Award, title: t("invest.visaTitle"), desc: t("invest.visaDesc") },
  ];

  return (<>
      <SEOHead
        title={t("seo.invest.title")}
        description={t("seo.invest.description")}
        canonical="https://asasinvest.com/invest"
        jsonLd={[
          breadcrumbJsonLd([
            { name: t("seo.breadcrumb.home"), url: "https://asasinvest.com" },
            { name: t("seo.breadcrumb.invest") },
          ]),
          faqJsonLd(localizedFaq(t, "seo.faqInvest")),
        ]}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          {/* Hero */}
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-eyebrow text-accent mb-4">{t("invest.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">{t("invest.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("invest.description")}</p>
          </ScrollReveal>

          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-5xl mx-auto">
            {valueProps.map((vp) => (
              <div key={vp.title} className="card-luxury p-8 text-center hover-lift">
                <div className="w-14 h-14 border border-accent/30 flex items-center justify-center mx-auto mb-5">
                  <vp.icon className="h-7 w-7 text-accent" strokeWidth={1} />
                </div>
                <h3 className="heading-section text-lg text-foreground mb-3">{vp.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{vp.desc}</p>
              </div>
            ))}
          </div>

          {/* ROI Calculator */}
          <div id="calculator" className="max-w-2xl mx-auto mb-20">
            <ScrollReveal className="text-center mb-8">
              <h2 className="heading-section text-2xl text-foreground mb-3">{t("invest.calcTitle")}</h2>
              <p className="text-muted-foreground">{t("invest.calcDesc")}</p>
            </ScrollReveal>
            <div className="card-luxury p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <Label>{t("invest.purchasePrice")}</Label>
                  <Input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="e.g., 1500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("invest.monthlyRent")}</Label>
                  <Input
                    type="number"
                    value={expectedRent}
                    onChange={(e) => setExpectedRent(e.target.value)}
                    placeholder="e.g., 8000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 border border-accent/30 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("invest.grossROI")}</p>
                  <p className="heading-hero text-3xl text-accent">{grossROI}%</p>
                </div>
                <div className="p-6 border border-accent/30 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("invest.netROI")}</p>
                  <p className="heading-hero text-3xl text-accent">{netROI}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">{t("invest.calcNote")}</p>
            </div>
          </div>

          {/* Why Dubai */}
          <div id="why-dubai" className="max-w-3xl mx-auto mb-20">
            <ScrollReveal className="text-center mb-8">
              <h2 className="heading-section text-2xl text-foreground mb-3">{t("invest.whyDubaiTitle")}</h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Globe, title: t("invest.whyTax"), desc: t("invest.whyTaxDesc") },
                { icon: TrendingUp, title: t("invest.whyYields"), desc: t("invest.whyYieldsDesc") },
                { icon: Shield, title: t("invest.whyStability"), desc: t("invest.whyStabilityDesc") },
                { icon: Award, title: t("invest.whyLifestyle"), desc: t("invest.whyLifestyleDesc") },
              ].map((item) => (
                <div key={item.title} className={cn("flex gap-4", isRTL && "text-end")}>
                  <div className="w-10 h-10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-accent" strokeWidth={1} />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Golden Visa */}
          <div id="golden-visa" className="max-w-3xl mx-auto text-center">
            <ScrollReveal>
              <h2 className="heading-section text-2xl text-foreground mb-4">{t("invest.goldenVisaTitle")}</h2>
              <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t("invest.goldenVisaDesc")}</p>
            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default Invest;
