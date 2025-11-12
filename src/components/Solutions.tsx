import { Home, Building, Hotel, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Solutions = () => {
  const solutions = [
    {
      icon: Home,
      title: "Residential Investments",
      description: "Premium residential properties in high-growth markets offering stable returns and capital appreciation.",
      features: ["Luxury apartments", "Gated communities", "Prime locations"]
    },
    {
      icon: Building,
      title: "Commercial Real Estate",
      description: "Strategic commercial assets including office spaces and retail properties with long-term tenants.",
      features: ["Grade-A offices", "Retail centers", "Mixed-use developments"]
    },
    {
      icon: Hotel,
      title: "Hospitality Sector",
      description: "Boutique hotels and hospitality properties in premium tourist destinations with high occupancy rates.",
      features: ["Boutique hotels", "Resort properties", "Serviced apartments"]
    },
    {
      icon: TrendingUp,
      title: "Wealth Management",
      description: "Comprehensive wealth management strategies tailored to maximize your real estate investment portfolio.",
      features: ["Portfolio optimization", "Risk management", "Tax efficiency"]
    }
  ];

  return (
    <section id="solutions" className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Investment Solutions
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Diversified real estate strategies designed to build and preserve wealth
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {solutions.map((solution, index) => (
            <Card
              key={index}
              className="border-2 hover:border-accent transition-all duration-300 hover:shadow-elegant group"
            >
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <solution.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-serif">{solution.title}</CardTitle>
                <CardDescription className="text-base">{solution.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {solution.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solutions;
