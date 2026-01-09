import { TrendingUp, Shield, PieChart, Building } from "lucide-react";

const InvestorValue = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Strategic ROI Focus",
      description: "Data-driven property selection designed to maximize your return on investment over time."
    },
    {
      icon: Shield,
      title: "Tax-Efficient Structures",
      description: "Benefit from UAE's favorable tax environment with no income or capital gains taxes on property."
    },
    {
      icon: PieChart,
      title: "Portfolio Diversification",
      description: "Spread risk across residential, commercial, and hospitality assets in prime locations."
    },
    {
      icon: Building,
      title: "Prime Asset Selection",
      description: "Access to exclusive properties in Dubai's most promising and established communities."
    }
  ];

  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text */}
          <div>
            <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
              Investor Benefits
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-6 leading-tight">
              Why Invest in UAE Real Estate?
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed mb-8">
              The UAE offers one of the world's most attractive environments for real estate investment. 
              With strong rental yields, capital appreciation potential, and a business-friendly regulatory 
              framework, Dubai continues to attract global investors.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                <span className="text-sm font-medium">6-8% Rental Yields</span>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                <span className="text-sm font-medium">0% Property Tax</span>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg px-5 py-3">
                <span className="text-sm font-medium">Golden Visa Eligible</span>
              </div>
            </div>
          </div>

          {/* Right Column - Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-primary-foreground/5 rounded-xl p-6 hover:bg-primary-foreground/10 transition-colors duration-300"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 bg-accent/20 rounded-lg mb-4">
                  <benefit.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-medium text-lg mb-2">
                  {benefit.title}
                </h3>
                <p className="text-primary-foreground/70 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InvestorValue;
