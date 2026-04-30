import { MapPin, BedDouble, Bath, Maximize, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import marinaImage from "@/assets/property-marina.jpg";
import villaImage from "@/assets/property-villa.jpg";
import apartmentImage from "@/assets/property-apartment.jpg";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface PropertyCardProps {
  property: {
    image: string;
    title: string;
    location: string;
    type: string;
    beds: number;
    baths: number;
    area: string;
    price: string;
  };
  index: number;
}

const PropertyCard = ({ property, index }: PropertyCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "For Sale":
        return "bg-primary text-primary-foreground";
      case "For Lease":
        return "bg-accent text-accent-foreground";
      case "Off-Plan":
        return "bg-foreground/10 text-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <StaggerItem>
      <div 
        ref={ref}
        className="group bg-card rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-elegant h-full"
      >
        {/* Image with Parallax */}
        <div className="relative overflow-hidden h-64">
          <motion.img
            src={property.image}
            alt={property.title}
            className="w-full h-[120%] object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ y: imageY }}
          />
          <div className={`absolute top-4 start-4 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide ${getTypeStyles(property.type)}`}>
            {property.type}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center text-muted-foreground text-sm mb-2">
            <MapPin className="h-3.5 w-3.5 me-1.5" />
            <span>{property.location}</span>
          </div>
          <h3 className="heading-section text-xl text-foreground mb-4 group-hover:text-accent transition-colors">
            {property.title}
          </h3>

          {/* Specs */}
          <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4 pb-4 border-b border-border">
            {property.beds && (
              <div className="flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" />
                <span>{property.beds}</span>
              </div>
            )}
            {property.baths && (
              <div className="flex items-center gap-1.5">
                <Bath className="h-4 w-4" />
                <span>{property.baths}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4" />
              <span>{property.area}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="heading-section text-lg text-foreground">
              {property.price}
            </span>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent hover:bg-accent/10">
              View Details
              <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
};

const Properties = () => {
  const properties = [
    {
      image: marinaImage,
      title: "Marina Heights Residences",
      location: "Dubai Marina",
      type: "For Sale",
      beds: 3,
      baths: 2,
      area: "2,450 sqft",
      price: "AED 3.2M"
    },
    {
      image: apartmentImage,
      title: "Business Bay Tower",
      location: "Business Bay",
      type: "For Lease",
      beds: 2,
      baths: 2,
      area: "1,800 sqft",
      price: "AED 180K/yr"
    },
    {
      image: villaImage,
      title: "Palm Jumeirah Villa",
      location: "Palm Jumeirah",
      type: "Off-Plan",
      beds: 5,
      baths: 6,
      area: "8,200 sqft",
      price: "AED 18.5M"
    }
  ];

  return (
    <section id="properties" className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">
            Featured Properties
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-foreground mb-6">
            Curated Properties in Prime Locations
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Explore our selection of premium properties across Dubai's most sought-after neighborhoods.
          </p>
        </ScrollReveal>

        {/* Properties Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property, index) => (
            <PropertyCard key={index} property={property} index={index} />
          ))}
        </StaggerContainer>

        {/* View All CTA */}
        <ScrollReveal delay={0.3} className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-sm font-medium tracking-wide">
            View All Properties
            <ArrowRight className="ms-2 h-4 w-4" />
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Properties;
