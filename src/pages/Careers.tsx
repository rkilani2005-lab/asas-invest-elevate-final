import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Careers = () => {
  const { t, isRTL } = useLanguage();

  return (<>
      <SEOHead
        title="Careers at Asas Invest | Join Our Dubai Real Estate Team"
        description="Join Asas Invest and build your career in Dubai luxury real estate. Current openings in sales, marketing, and property management."
        canonical="https://asasinvest.com/about/careers"
        jsonLd={breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"About",url:"https://asasinvest.com/about"},{name:"Careers"}])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8 max-w-3xl", isRTL && "font-arabic")}>
          <ScrollReveal className="text-center mb-12">
            <p className="text-eyebrow text-accent mb-4">{t("careers.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl text-accent mb-6">{t("careers.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">{t("careers.description")}</p>
            <Button variant="luxury" size="lg" asChild>
              <a href="mailto:careers@asasinvest.ae">{t("careers.applyNow")}</a>
            </Button>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default Careers;
