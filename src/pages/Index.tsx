import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import EditorialBand from "@/components/EditorialBand";
import Stats from "@/components/Stats";
import WhyAsas from "@/components/WhyAsas";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SEOHead, { organizationJsonLd, websiteJsonLd } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        canonical="https://asasinvest.com/"
        jsonLd={[organizationJsonLd, websiteJsonLd]}
      />
      <Navigation />
      <main>
        <Hero />
        <FeaturedProperties />
        <EditorialBand />
        <Stats />
        <WhyAsas />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
