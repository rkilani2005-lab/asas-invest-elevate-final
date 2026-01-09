import { MapPin, BedDouble, Bath, Maximize, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import residentialImage from "@/assets/project-residential.jpg";
import commercialImage from "@/assets/project-commercial.jpg";
import hospitalityImage from "@/assets/project-hospitality.jpg";

const Properties = () => {
  const properties = [
    {
      image: residentialImage,
      title: "Marina Heights Residences",
      location: "Dubai Marina",
      type: "For Sale",
      beds: 3,
      baths: 2,
      area: "2,450 sqft",
      price: "AED 3.2M"
    },
    {
      image: commercialImage,
      title: "Business Bay Office",
      location: "Business Bay",
      type: "For Lease",
      beds: null,
      baths: null,
      area: "5,800 sqft",
      price: "AED 450K/yr"
    },
    {
      image: hospitalityImage,
      title: "Palm Jumeirah Villa",
      location: "Palm Jumeirah",
      type: "Off-Plan",
      beds: 5,
      baths: 6,
      area: "8,200 sqft",
      price: "AED 18.5M"
    }
  ];

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
    <section id="properties" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Featured Properties
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            Curated Properties in Prime Locations
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Explore our selection of premium properties across Dubai's most sought-after neighborhoods.
          </p>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property, index) => (
            <div
              key={index}
              className="group bg-card rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-elegant"
            >
              {/* Image */}
              <div className="relative overflow-hidden h-64">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide ${getTypeStyles(property.type)}`}>
                  {property.type}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center text-muted-foreground text-sm mb-2">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  <span>{property.location}</span>
                </div>
                <h3 className="font-serif text-xl font-medium text-foreground mb-4 group-hover:text-accent transition-colors">
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
                  <span className="font-serif text-lg font-medium text-foreground">
                    {property.price}
                  </span>
                  <Button variant="ghost" size="sm" className="text-accent hover:text-accent hover:bg-accent/10">
                    View Details
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-sm font-medium tracking-wide">
            View All Properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Properties;
