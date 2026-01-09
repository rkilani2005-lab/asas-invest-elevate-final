import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video with Elegant Overlay */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/dubai-palm.jpg"
          className="w-full h-full object-cover"
        >
          <source src="/videos/dubai-palm.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-hero-overlay"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center">
        <p className="text-primary-foreground/80 text-sm md:text-base tracking-widest uppercase mb-4 animate-fade-in">
          Real Estate Investment & Asset Management
        </p>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-medium text-primary-foreground mb-6 animate-fade-in leading-tight" style={{ animationDelay: "0.1s" }}>
          Strategic Real Estate <br className="hidden md:block" />
          Investment in the <span className="text-accent">UAE</span>
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/85 mb-10 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s" }}>
          Building wealth through carefully selected properties in Dubai's most promising locations
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button 
            size="lg" 
            className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 text-sm font-medium tracking-wide px-8 py-6"
          >
            Explore Properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/60 transition-all duration-300 text-sm font-medium tracking-wide px-8 py-6"
          >
            Contact Us
          </Button>
        </div>
      </div>

      {/* Subtle Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-60">
        <div className="w-[1px] h-16 bg-gradient-to-b from-primary-foreground/0 via-primary-foreground/50 to-primary-foreground/0"></div>
      </div>
    </section>
  );
};

export default Hero;
