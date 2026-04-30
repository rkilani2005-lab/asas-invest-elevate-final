import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Insights = () => {
  const { t, isRTL, language } = useLanguage();

  // Fetch latest 3 published insights from database
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', 'homepage', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  // Type for article display
  type ArticleDisplay = {
    id: string;
    slug: string;
    category: string;
    title_en: string;
    title_ar?: string | null;
    excerpt_en?: string | null;
    excerpt_ar?: string | null;
    published_at?: string | null;
    read_time_minutes?: number | null;
  };

  // Get localized content
  const getLocalizedContent = (item: ArticleDisplay) => ({
    title: language === 'ar' && item.title_ar ? item.title_ar : item.title_en,
    excerpt: language === 'ar' && item.excerpt_ar ? item.excerpt_ar : item.excerpt_en,
  });

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      market_news: { en: "Dubai Market", ar: "سوق دبي" },
      investment_guide: { en: "Investment Guide", ar: "دليل الاستثمار" },
      project_updates: { en: "Project Updates", ar: "تحديثات المشاريع" },
      lifestyle: { en: "Lifestyle", ar: "أسلوب الحياة" },
    };
    const label = labels[category];
    return label ? (language === 'ar' ? label.ar : label.en) : category;
  };

  // Fallback articles for when database is empty
  const fallbackArticles = [
    {
      id: '1',
      slug: 'dubai-real-estate-trends-2026',
      category: "market_news",
      title_en: "Dubai Real Estate Trends to Watch in 2026",
      title_ar: "اتجاهات العقارات في دبي لعام 2026",
      excerpt_en: "Key market dynamics and emerging opportunities for investors in Dubai's evolving property landscape.",
      excerpt_ar: "ديناميكيات السوق الرئيسية والفرص الناشئة للمستثمرين في سوق العقارات المتطور في دبي.",
      published_at: "2026-01-05",
      read_time_minutes: 5
    },
    {
      id: '2',
      slug: 'first-time-property-investment-uae',
      category: "investment_guide",
      title_en: "First-Time Property Investment in UAE: What You Need to Know",
      title_ar: "الاستثمار العقاري للمرة الأولى في الإمارات: ما تحتاج معرفته",
      excerpt_en: "Essential considerations for new investors entering the UAE real estate market.",
      excerpt_ar: "اعتبارات أساسية للمستثمرين الجدد الذين يدخلون سوق العقارات في الإمارات.",
      published_at: "2026-01-02",
      read_time_minutes: 7
    },
    {
      id: '3',
      slug: 'off-plan-vs-ready-properties',
      category: "project_updates",
      title_en: "Off-Plan vs Ready Properties: Making the Right Choice",
      title_ar: "العقارات على المخطط مقابل الجاهزة: اتخاذ القرار الصحيح",
      excerpt_en: "Comparing investment strategies and understanding the pros and cons of each approach.",
      excerpt_ar: "مقارنة استراتيجيات الاستثمار وفهم إيجابيات وسلبيات كل نهج.",
      published_at: "2025-12-28",
      read_time_minutes: 6
    }
  ];

  const articles: ArticleDisplay[] = insights && insights.length > 0 ? insights : fallbackArticles;

  return (
    <section id="insights" className="py-24 bg-secondary/30">
      <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4 inline-flex items-center gap-2">
            <span className="pulse-dot" aria-hidden /> {t("insights.subtitle")}
          </p>
          <h2 className="heading-section text-3xl md:text-5xl text-foreground mb-6">
            {t("insights.title")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("insights.description")}
          </p>
        </ScrollReveal>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[1, 2, 3].map((i) => (
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
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {articles.map((article) => {
              const content = getLocalizedContent(article);
              return (
                <StaggerItem key={article.id}>
                  <Link to={`/insights/${article.slug}`}>
                    <article className={cn(
                      "card-luxury p-6 cursor-pointer h-full",
                      isRTL && "text-end"
                    )}>
                      <div className="inline-flex items-center rounded-full px-3 py-1 bg-accent/10 text-accent text-xs font-medium mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {getCategoryLabel(article.category)}
                      </div>
                      <h3 className="heading-section text-xl text-foreground mb-3 group-hover:text-accent transition-colors">
                        {content.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                        {content.excerpt}
                      </p>
                      <div className={cn(
                        "flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border"
                      )}>
                        <div className={cn("flex items-center")}>
                          <Calendar className={cn("h-3.5 w-3.5", isRTL ? "ms-1.5" : "me-1.5")} />
                          <span>
                            {article.published_at && format(new Date(article.published_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <span>{article.read_time_minutes} {isRTL ? "د" : "min"}</span>
                      </div>
                    </article>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {/* View All CTA */}
        <ScrollReveal delay={0.3} className="text-center">
          <Link to="/insights">
            <Button variant="outline" size="lg" className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-sm font-medium tracking-wide">
              {t("insights.viewAll")}
              <ArrowRight className={cn("h-4 w-4", isRTL ? "me-2 rotate-180" : "ms-2")} />
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Insights;
