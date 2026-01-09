import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WhyAsas from "@/components/WhyAsas";
import Services from "@/components/Services";
import Properties from "@/components/Properties";
import InvestorValue from "@/components/InvestorValue";
import Insights from "@/components/Insights";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <WhyAsas />
        <Services />
        <Properties />
        <InvestorValue />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
