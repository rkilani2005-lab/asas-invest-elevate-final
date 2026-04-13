import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Building2, Home, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const Buy = () => {
  const { t, isRTL } = useLanguage();

  const categories = [
    {
      icon: Home,
      title: t("buy.livingTitle"),
      description: t("buy.livingDesc"),
      links: [
        { label: t("nav.buyReady"), href: "/ready" },
        { label: t("nav.buyOffPlan"), href: "/off-plan" },
      ],
    },
    {
      icon: Building2,
      title: t("buy.businessTitle"),
      description: t("buy.businessDesc"),
      links: [
        { label: t("nav.buyCommercial"), href: "/commercial" },
      ],
    },
  ];

  return (<>
      <SEOHead
        title="Buy Property in Dubai | Asas Invest"
        description="Find your ideal home or investment property in Dubai. Freehold ownership, expert advisory, curated selection from top developers."
        canonical="https://asasinvest.com/buy"
        jsonLd={breadcrumbJsonLd([{name:"Home",url:"https://asasinvest.com"},{name:"Buy"}])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-eyebrow text-accent mb-4">{t("buy.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">
              {t("buy.title")}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t("buy.description")}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {categories.map((cat) => (
              <div key={cat.title} className="card-luxury p-8 flex flex-col items-center text-center hover-lift">
                <div className="w-16 h-16 border border-accent/30 flex items-center justify-center mb-6">
                  <cat.icon className="h-8 w-8 text-accent" strokeWidth={1} />
                </div>
                <h2 className="heading-section text-xl text-foreground mb-3">{cat.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{cat.description}</p>
                <div className="space-y-2 w-full">
                  {cat.links.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex items-center justify-between px-4 py-3 border border-accent/20 hover:border-accent hover:bg-accent/5 transition-all duration-300 group"
                    >
                      <span className="text-sm font-medium text-foreground group-hover:text-accent">{link.label}</span>
                      <ArrowRight className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default Buy;
