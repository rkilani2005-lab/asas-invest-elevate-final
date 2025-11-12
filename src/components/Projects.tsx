import { MapPin, TrendingUp } from "lucide-react";
import residentialImage from "@/assets/project-residential.jpg";
import commercialImage from "@/assets/project-commercial.jpg";
import hospitalityImage from "@/assets/project-hospitality.jpg";

const Projects = () => {
  const projects = [
    {
      image: residentialImage,
      title: "Skyline Residences",
      location: "Downtown Metro",
      type: "Residential",
      roi: "18% Annual ROI",
      status: "Delivering Returns"
    },
    {
      image: commercialImage,
      title: "Corporate Plaza",
      location: "Business District",
      type: "Commercial",
      roi: "16% Annual ROI",
      status: "Fully Leased"
    },
    {
      image: hospitalityImage,
      title: "Luxury Haven Hotel",
      location: "Coastal Region",
      type: "Hospitality",
      roi: "22% Annual ROI",
      status: "Premium Asset"
    }
  ];

  return (
    <section id="projects" className="py-20 bg-muted">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Featured Projects
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our portfolio of successful real estate investments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="bg-card rounded-xl overflow-hidden shadow-elegant hover:shadow-luxury transition-all duration-300 group hover:-translate-y-2"
            >
              <div className="relative overflow-hidden h-64">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  {project.type}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">
                  {project.title}
                </h3>
                <div className="flex items-center text-muted-foreground mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">{project.location}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center text-secondary">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    <span className="font-semibold">{project.roi}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{project.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
