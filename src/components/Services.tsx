import { Key, Building2, ShoppingBag, LineChart, FileSearch, Briefcase } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

const Services = () => {
  const services = [
    {
      icon: Key,
      title: "Property Leasing",
      description: "Expert leasing services to maximize your rental income with quality tenants and optimal pricing strategies."
    },
    {
      icon: Building2,
      title: "Property Management",
      description: "Comprehensive management solutions ensuring your properties are maintained, occupied, and performing."
    },
    {
      icon: ShoppingBag,
      title: "Acquisitions & Sales",
      description: "Strategic property acquisitions and sales, guiding you through every step of the transaction."
    },
    {
      icon: LineChart,
      title: "Investment Advisory",
      description: "Tailored investment strategies aligned with your financial goals and risk appetite."
    },
    {
      icon: FileSearch,
      title: "Asset Valuation",
      description: "Accurate property valuations backed by market data and professional expertise."
    },
    {
      icon: Briefcase,
      title: "Portfolio Services",
      description: "Holistic portfolio management to diversify and optimize your real estate investments."
    }
  ];

  return (
    <section id="services" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Our Services
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            Comprehensive Real Estate Solutions
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            From property acquisition to ongoing management, we provide end-to-end services 
            to support every stage of your investment journey.
          </p>
        </ScrollReveal>

        {/* Services Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <StaggerItem key={index}>
              <div className="group bg-card rounded-xl p-8 border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-elegant h-full">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-6 group-hover:bg-accent/20 transition-colors duration-300">
                  <service.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Services;
