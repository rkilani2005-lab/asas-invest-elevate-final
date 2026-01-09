import { useState, useEffect } from "react";
import { Menu, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import asasLogo from "@/assets/asas-logo.jpg";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "About", href: "#about" },
    { name: "Services", href: "#services" },
    { name: "Properties", href: "#properties" },
    { name: "Insights", href: "#insights" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/98 backdrop-blur-md shadow-card border-b border-border" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#home" className="flex items-center">
            <img 
              src={asasLogo} 
              alt="Asas Invest Real Estate" 
              className="h-14 w-14 rounded-full object-cover"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-foreground/80 hover:text-foreground transition-colors duration-300 text-sm font-medium tracking-wide"
              >
                {link.name}
              </a>
            ))}
            <a 
              href="https://wa.me/971000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-foreground/80 hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 text-sm font-medium tracking-wide">
              Contact Us
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-6 border-t border-border bg-background/98 backdrop-blur-md">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-foreground/80 hover:text-foreground transition-colors duration-300 font-medium py-2 text-sm tracking-wide"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 flex flex-col space-y-3">
                <a 
                  href="https://wa.me/971000000000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-foreground/80 hover:text-foreground transition-colors py-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">WhatsApp</span>
                </a>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 w-full text-sm font-medium">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
