import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const WhatIsREIT = () => {
  const benefits = [
    "Access to premium real estate without full ownership costs",
    "Professionally managed portfolio of diversified assets",
    "Regular income potential from rental yields",
    "Liquidity compared to traditional property ownership",
    "Transparent and regulated investment structure"
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src="/images/dubai-skyline.jpg"
                alt="Dubai Skyline"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-elegant hidden md:block">
              <div className="font-serif text-3xl font-bold">10+</div>
              <div className="text-primary-foreground/80 text-sm">Years of Excellence</div>
            </div>
          </div>

          {/* Content Side */}
          <div className="lg:pl-8">
            <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
              Real Estate Investment
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
              What is Real Estate Investment?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Real estate investment involves purchasing property assets to generate income 
              through rental yields or capital appreciation. In the UAE, this offers unique 
              advantages including tax-free returns, strong rental markets, and world-class 
              infrastructure.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              At Asas Invest, we help investors navigate Dubai's dynamic property market, 
              offering access to premium residential, commercial, and hospitality assets 
              with professional management and transparent processes.
            </p>

            <ul className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <Link to="/insights">
              <Button variant="outline" className="group">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsREIT;
