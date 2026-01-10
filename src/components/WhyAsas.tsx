import { Eye, Shield, Users, Sparkles } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

const WhyAsas = () => {
  const values = [
    {
      icon: Eye,
      title: "Fresh Vision",
      description: "Modern investment strategies designed for today's dynamic real estate market"
    },
    {
      icon: Shield,
      title: "UAE Expertise",
      description: "Deep understanding of Dubai's property landscape and emerging opportunities"
    },
    {
      icon: Users,
      title: "Client-Focused",
      description: "Personalized service tailored to your unique investment goals and timeline"
    },
    {
      icon: Sparkles,
      title: "Transparent Approach",
      description: "Clear communication and honest guidance throughout your investment journey"
    }
  ];

  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Why Choose Us
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            A New Approach to Real Estate Investment
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Asas Invest brings fresh perspectives to the UAE property market, combining innovative 
            strategies with a client-first philosophy to help you build lasting wealth.
          </p>
        </ScrollReveal>

        {/* Values Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <StaggerItem key={index}>
              <div className="group text-center p-8 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-300 h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-background rounded-xl mb-6 group-hover:bg-accent/10 transition-colors duration-300">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Mission Statement */}
        <ScrollReveal delay={0.3} className="mt-20 max-w-4xl mx-auto text-center">
          <div className="bg-primary/5 rounded-2xl p-10 md:p-14">
            <blockquote className="font-serif text-xl md:text-2xl text-foreground leading-relaxed italic">
              "Our mission is to make strategic real estate investment accessible, transparent, 
              and rewarding for every client we serve."
            </blockquote>
            <p className="mt-6 text-muted-foreground text-sm tracking-wide">
              — Asas Invest Real Estate
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default WhyAsas;
