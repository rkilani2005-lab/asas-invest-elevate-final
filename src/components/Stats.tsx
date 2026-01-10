import { Building2, LayoutGrid, TrendingUp } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

const Stats = () => {
  const stats = [
    {
      icon: Building2,
      value: "15+",
      label: "Properties Managed",
      suffix: ""
    },
    {
      icon: LayoutGrid,
      value: "250,000",
      label: "Total Sq. Ft",
      suffix: "+"
    },
    {
      icon: TrendingUp,
      value: "AED 500M",
      label: "Portfolio Value",
      suffix: "+"
    }
  ];

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <ScrollReveal className="text-center mb-12">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Why Invest With Us
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-medium">
            Building Wealth Through Strategic Real Estate
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-2xl mx-auto">
            Our portfolio is composed of premium residential, commercial, and hospitality assets 
            designed to provide investors with safe, stable, and steady returns.
          </p>
        </ScrollReveal>
        
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <StaggerItem key={index}>
              <div className="text-center p-8 rounded-xl bg-primary-foreground/10 backdrop-blur-sm hover:bg-primary-foreground/15 transition-all duration-300">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/20 rounded-xl mb-4">
                  <stat.icon className="h-7 w-7 text-accent" />
                </div>
                <div className="font-serif text-3xl md:text-4xl font-bold mb-2">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-primary-foreground/70 text-sm tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Stats;
