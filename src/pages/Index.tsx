import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import WhyAsas from "@/components/WhyAsas";
import WhatIsREIT from "@/components/WhatIsREIT";
import Services from "@/components/Services";
import Properties from "@/components/Properties";
import InvestorValue from "@/components/InvestorValue";
import Team from "@/components/Team";
import LatestUpdates from "@/components/LatestUpdates";
import Insights from "@/components/Insights";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Stats />
        <WhyAsas />
        <WhatIsREIT />
        <Services />
        <Properties />
        <InvestorValue />
        <Team />
        <LatestUpdates />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
