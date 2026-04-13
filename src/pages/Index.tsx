import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import EditorialBand from "@/components/EditorialBand";
import Stats from "@/components/Stats";
import WhyAsas from "@/components/WhyAsas";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SEOHead, { organizationJsonLd } from "@/components/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Asas Invest | Dubai Real Estate Investment & Advisory"
        description="Strategic property investment, leasing & wealth management in Dubai. Off-plan projects, ready properties, Golden Visa advisory. Building generational wealth through smart real estate."
        canonical="https://asasinvest.com/"
        jsonLd={organizationJsonLd}
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
