import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import EditorialBand from "@/components/EditorialBand";
import Stats from "@/components/Stats";
import TrustCredentials from "@/components/TrustCredentials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SEOHead, { organizationJsonLd, websiteJsonLd } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.key]);

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
        <TrustCredentials />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
