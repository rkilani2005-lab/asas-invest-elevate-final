import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Solutions from "@/components/Solutions";
import Projects from "@/components/Projects";
import Insights from "@/components/Insights";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <section id="about">
          <Stats />
        </section>
        <Solutions />
        <Projects />
        <Insights />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
