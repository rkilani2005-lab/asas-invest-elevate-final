import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useState } from "react";
import insightsHero from "@/assets/insights-hero.jpg";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, ArrowLeft, Search, TrendingUp, Building, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BackToTop from "@/components/ui/back-to-top";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const InsightsPage = () => {
  const { language, isRTL, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { name: "All", icon: FileText },
    { name: "market_news", label: "Dubai Market", icon: Building },
    { name: "investment_guide", label: "Investment Guide", icon: TrendingUp },
    { name: "project_updates", label: "Project Updates", icon: MapPin },
    { name: "lifestyle", label: "Lifestyle", icon: FileText },
  ];

  // Fetch insights from database
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Get localized content
  const getLocalizedContent = (item: NonNullable<typeof insights>[0]) => ({
    title: language === 'ar' && item.title_ar ? item.title_ar : item.title_en,
    excerpt: language === 'ar' && item.excerpt_ar ? item.excerpt_ar : item.excerpt_en,
    author: language === 'ar' && item.author_ar ? item.author_ar : item.author_en,
  });

  // Get category label
  const getCategoryLabel = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.label || categoryName;
  };

  // Filter articles
  const filteredArticles = insights?.filter(article => {
    const matchesCategory = activeCategory === "All" || article.category === activeCategory;
    const content = getLocalizedContent(article);
    const matchesSearch = !searchQuery || 
      content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  // Get featured article (first featured or first article)
  const featuredArticle = insights?.find(a => a.is_featured) || insights?.[0];

  return (<>
      <SEOHead
        title={t("seo.insights.title")}
        description={t("seo.insights.description")}
        canonical="https://asasinvest.com/insights"
        jsonLd={breadcrumbJsonLd([
          { name: t("seo.breadcrumb.home"), url: "https://asasinvest.com" },
          { name: t("seo.breadcrumb.insights") },
        ])}
      />
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 text-primary-foreground overflow-hidden bg-primary min-h-[420px] md:min-h-[480px]">
        {/* Background image — anchored to bottom on mobile so the skyline sits below the nav, recentered on larger screens */}
        <div className="absolute inset-0 z-0">
          <img
            src={insightsHero}
            alt="Dubai skyline at golden hour"
            width={1920}
            height={1080}
            fetchPriority="high"
            className="w-full h-full object-cover object-bottom sm:object-[center_75%] lg:object-center"
          />
          {/* Top fade keeps the navigation legible across breakpoints */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/80 via-primary/40 to-transparent md:hidden" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl-flip" />
            {t("insights.backHome")}
          </Link>
          <p className="text-eyebrow text-accent mb-4 inline-flex items-center gap-2">
            <span className="pulse-dot" aria-hidden /> {t("insights.heroEyebrow")}
          </p>
          <h1 className={cn("heading-hero text-4xl md:text-6xl mb-6 max-w-3xl text-white", isRTL && "font-arabic")}>
            {t("insights.heroTitle")}
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl leading-relaxed">
            {t("insights.heroDescription")}
          </p>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 border-b border-border bg-background sticky top-20 z-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-between gap-4"
          )}>
            {/* Categories */}
            <div className={cn("flex flex-wrap gap-2")}>
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={cn(
                    "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    activeCategory === category.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  <category.icon className="h-4 w-4 me-2" />
                  {category.name === "All" ? t("insights.all") : (category.label || category.name)}
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
              <Input 
                placeholder={t("insights.searchPlaceholder")} 
                className="bg-secondary border-0 ps-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {activeCategory === "All" && featuredArticle && !isLoading && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <ScrollReveal direction="up" className="bg-secondary/50 rounded-2xl p-8 md:p-12 hover:bg-secondary/70 transition-colors duration-300 cursor-pointer group">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3">
                  <div className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium tracking-wide mb-4">
                    {t("insights.featured")} • {getCategoryLabel(featuredArticle.category)}
                  </div>
                  <h2 className={cn(
                    "heading-section text-2xl md:text-4xl text-foreground mb-4 group-hover:text-accent transition-colors",
                    isRTL && "font-arabic"
                  )}>
                    {getLocalizedContent(featuredArticle).title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {getLocalizedContent(featuredArticle).excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 me-1.5" />
                      {featuredArticle.published_at && format(new Date(featuredArticle.published_at), 'MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 me-1.5" />
                      {featuredArticle.read_time_minutes} {t("insights.minRead")}
                    </div>
                    {getLocalizedContent(featuredArticle).author && (
                      <span className="text-foreground/60">
                        {t("insights.by")} {getLocalizedContent(featuredArticle).author}
                      </span>
                    )}
                  </div>
                </div>
                <div className="lg:w-1/3 flex items-center justify-center lg:justify-end">
                  <Link to={`/insights/${featuredArticle.slug}`}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {t("insights.readFullArticle")}
                      <ArrowRight className="h-4 w-4 ms-2 rtl-flip" />
                    </Button>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className={cn("heading-section text-2xl md:text-3xl text-foreground", isRTL && "font-arabic")}>
              {activeCategory === "All" 
                ? t("insights.latestArticles")
                : getCategoryLabel(activeCategory)
              }
            </h2>
            <span className="text-muted-foreground text-sm">
              {t("insights.articleCount", { count: filteredArticles.length })}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-6">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-16 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const content = getLocalizedContent(article);
                return (
                  <StaggerItem key={article.id}>
                    <Link to={`/insights/${article.slug}`}>
                      <article className="card-luxury p-6 cursor-pointer h-full">
                        <div className="inline-flex items-center rounded-full px-3 py-1 bg-accent/10 text-accent text-xs font-medium mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {getCategoryLabel(article.category)}
                        </div>
                        <h3 className={cn(
                          "heading-section text-xl text-foreground mb-3 group-hover:text-accent transition-colors",
                          isRTL && "font-arabic"
                        )}>
                          {content.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-3">
                          {content.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                          <div className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 me-1.5" />
                            <span>
                              {article.published_at && format(new Date(article.published_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <span>{article.read_time_minutes} {t("insights.minShort")}</span>
                        </div>
                      </article>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}

          {!isLoading && filteredArticles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {t("insights.noArticles")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className={cn("max-w-2xl mx-auto text-center", isRTL && "font-arabic")}>
            <h2 className="heading-section text-2xl md:text-4xl text-foreground mb-4">
              {t("insights.newsletterTitle")}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t("insights.newsletterDesc")}
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder={t("insights.emailPlaceholder")} 
                className="bg-background border-border flex-1"
              />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                {t("insights.subscribe")}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">
              {t("insights.newsletterDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <BackToTop />
    </div>
  </>);
};

export default InsightsPage;
