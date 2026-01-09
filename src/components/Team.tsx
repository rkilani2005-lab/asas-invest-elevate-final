import { Linkedin, Mail } from "lucide-react";
import teamAhmed from "@/assets/team-ahmed.jpg";
import teamSarah from "@/assets/team-sarah.jpg";
import teamOmar from "@/assets/team-omar.jpg";

const Team = () => {
  const team = [
    {
      name: "Ahmed Al Rashid",
      role: "Founder & CEO",
      bio: "With extensive experience in UAE real estate and investment banking, Ahmed founded Asas Invest to bring institutional-grade investment strategies to individual investors.",
      image: teamAhmed,
      linkedin: "#",
      email: "ahmed@asasinvest.ae"
    },
    {
      name: "Sarah Mitchell",
      role: "Head of Investments",
      bio: "Sarah leads our investment strategy and portfolio management, bringing over a decade of experience in commercial real estate across the GCC region.",
      image: teamSarah,
      linkedin: "#",
      email: "sarah@asasinvest.ae"
    },
    {
      name: "Omar Hassan",
      role: "Director of Property Services",
      bio: "Omar oversees all property management and leasing operations, ensuring our clients' assets are maintained to the highest standards.",
      image: teamOmar,
      linkedin: "#",
      email: "omar@asasinvest.ae"
    }
  ];

  return (
    <section id="team" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Our Team
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            Meet the Leadership
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A dedicated team of professionals committed to helping you achieve your real estate investment goals.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <div
              key={index}
              className="group text-center"
            >
              {/* Portrait */}
              <div className="relative w-48 h-48 mx-auto mb-6">
                <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Decorative ring on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-accent/30 transition-colors duration-300"></div>
              </div>

              {/* Info */}
              <h3 className="font-serif text-xl font-medium text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-accent text-sm font-medium mb-4">
                {member.role}
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5 px-4">
                {member.bio}
              </p>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-3">
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/10 hover:text-accent transition-colors duration-300"
                  aria-label={`${member.name} LinkedIn`}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href={`mailto:${member.email}`}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/10 hover:text-accent transition-colors duration-300"
                  aria-label={`Email ${member.name}`}
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Company Note */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Our team is supported by a network of trusted partners including legal advisors, 
            financial consultants, and property specialists across the UAE.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Team;
