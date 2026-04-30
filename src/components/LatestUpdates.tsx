import { ArrowRight, Calendar, Megaphone, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const LatestUpdates = () => {
  const { t, isRTL } = useLanguage();

  // Sample announcement & press content — content_team can later move to CMS
  const announcements = isRTL
    ? [
        { title: "إطلاق فرص استثمار الربع الرابع 2025", date: "5 يناير 2026" },
        { title: "شراكة جديدة لتطوير نخلة جميرا", date: "28 ديسمبر 2025" },
        { title: "جدولة الاجتماع السنوي للمستثمرين", date: "15 ديسمبر 2025" },
        { title: "توسيع محفظة دبي مارينا", date: "1 ديسمبر 2025" },
      ]
    : [
        { title: "Q4 2025 Investment Opportunities Released", date: "January 5, 2026" },
        { title: "New Palm Jumeirah Development Partnership", date: "December 28, 2025" },
        { title: "Annual Investor Meeting Scheduled", date: "December 15, 2025" },
        { title: "Dubai Marina Portfolio Expansion", date: "December 1, 2025" },
      ];

  const pressReleases = isRTL
    ? [
        { title: "تكريم أساس إنفست كأبرز شركة عقارية ناشئة", date: "20 نوفمبر 2025" },
        { title: "شراكة استراتيجية مع مطوّر إماراتي رائد", date: "15 أكتوبر 2025" },
      ]
    : [
        { title: "Asas Invest Named Top Emerging Real Estate Firm", date: "November 20, 2025" },
        { title: "Strategic Partnership with Leading UAE Developer", date: "October 15, 2025" },
      ];

  return (
    <section className="py-24 bg-background">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        <ScrollReveal className="text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">
            {t("latestUpdates.subtitle")}
          </p>
          <h2 className="heading-section text-3xl md:text-4xl text-foreground">
            {t("latestUpdates.title")}
          </h2>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Announcements */}
          <ScrollReveal direction="left">
            <div className="card-luxury p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Megaphone className="h-5 w-5 text-accent" />
                </div>
                <h3 className="heading-section text-xl text-foreground">
                  {t("latestUpdates.announcements")}
                </h3>
              </div>

              <StaggerContainer className="space-y-4 mb-6">
                {announcements.map((item, index) => (
                  <StaggerItem key={index}>
                    <div className="group flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-background/50 transition-colors cursor-pointer">
                      <span className="text-foreground group-hover:text-accent transition-colors">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground text-sm whitespace-nowrap flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <Link to="/insights">
                <Button variant="ghost" className="group text-accent hover:text-accent">
                  {t("latestUpdates.viewAllAnnouncements")}
                  <ArrowRight className="ms-2 h-4 w-4 group-hover:translate-x-1 transition-transform rtl-flip" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Press Releases */}
          <ScrollReveal direction="right">
            <div className="card-luxury p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Newspaper className="h-5 w-5 text-accent" />
                </div>
                <h3 className="heading-section text-xl text-foreground">
                  {t("latestUpdates.pressReleases")}
                </h3>
              </div>

              <StaggerContainer className="space-y-4 mb-6">
                {pressReleases.map((item, index) => (
                  <StaggerItem key={index}>
                    <div className="group flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-background/50 transition-colors cursor-pointer">
                      <span className="text-foreground group-hover:text-accent transition-colors">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground text-sm whitespace-nowrap flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <Link to="/insights">
                <Button variant="ghost" className="group text-accent hover:text-accent">
                  {t("latestUpdates.viewAllPress")}
                  <ArrowRight className="ms-2 h-4 w-4 group-hover:translate-x-1 transition-transform rtl-flip" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default LatestUpdates;
