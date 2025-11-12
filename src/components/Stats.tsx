import { TrendingUp, Building2, Users, Award } from "lucide-react";

const Stats = () => {
  const stats = [
    {
      icon: Building2,
      value: "$2.5B+",
      label: "Portfolio Value",
      description: "Across diverse real estate assets"
    },
    {
      icon: TrendingUp,
      value: "15%",
      label: "Average Annual ROI",
      description: "Consistent performance track record"
    },
    {
      icon: Users,
      value: "500+",
      label: "Active Investors",
      description: "Trust us with their wealth"
    },
    {
      icon: Award,
      value: "25+",
      label: "Years Experience",
      description: "In real estate investment"
    }
  ];

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-8 shadow-elegant hover:shadow-luxury transition-all duration-300 text-center group hover:-translate-y-1"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-accent rounded-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="font-serif text-4xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
