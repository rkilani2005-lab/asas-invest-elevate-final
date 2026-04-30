import { Linkedin, Mail } from "lucide-react";
import teamAhmed from "@/assets/team-ahmed.jpg";
import teamSarah from "@/assets/team-sarah.jpg";
import teamOmar from "@/assets/team-omar.jpg";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Team = () => {
  const { t, isRTL } = useLanguage();

  const team = [
    {
      nameKey: "team.members.ahmed.name",
      roleKey: "team.members.ahmed.role",
      bioKey: "team.members.ahmed.bio",
      image: teamAhmed,
      linkedin: "#",
      email: "ahmed@asasinvest.ae"
    },
    {
      nameKey: "team.members.sarah.name",
      roleKey: "team.members.sarah.role",
      bioKey: "team.members.sarah.bio",
      image: teamSarah,
      linkedin: "#",
      email: "sarah@asasinvest.ae"
    },
    {
      nameKey: "team.members.omar.name",
      roleKey: "team.members.omar.role",
      bioKey: "team.members.omar.bio",
      image: teamOmar,
      linkedin: "#",
      email: "omar@asasinvest.ae"
    }
  ];

  return (
    <section id="team" className="py-24 bg-background">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            {t("team.subtitle")}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            {t("team.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("team.description")}
          </p>
        </ScrollReveal>

        {/* Team Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <StaggerItem key={index}>
              <div className="group text-center">
                {/* Portrait */}
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                    <img 
                      src={member.image} 
                      alt={t(member.nameKey)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Decorative ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-accent/30 transition-colors duration-300"></div>
                </div>

                {/* Info */}
                <h3 className="font-serif text-xl font-medium text-foreground mb-1">
                  {t(member.nameKey)}
                </h3>
                <p className="text-accent text-sm font-medium mb-4">
                  {t(member.roleKey)}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5 px-4">
                  {t(member.bioKey)}
                </p>

                {/* Social Links */}
                <div className={cn(
                  "flex items-center justify-center gap-3"
                )}>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/10 hover:text-accent transition-colors duration-300"
                    aria-label={`${t(member.nameKey)} LinkedIn`}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a
                    href={`mailto:${member.email}`}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent/10 hover:text-accent transition-colors duration-300"
                    aria-label={`Email ${t(member.nameKey)}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Company Note */}
        <ScrollReveal delay={0.3} className="mt-16 text-center">
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            {t("team.companyNote")}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Team;
