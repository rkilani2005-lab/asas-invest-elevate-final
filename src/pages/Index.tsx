import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import Stats from "@/components/Stats";
import WhyAsas from "@/components/WhyAsas";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <FeaturedProperties />
        <Stats />
        <WhyAsas />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
