import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const InsightDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, isRTL } = useLanguage();

  // Fetch insight by slug
  const { data: insight, isLoading, error } = useQuery({
    queryKey: ['insight', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Get localized content
  const getLocalizedContent = () => {
    if (!insight) return { title: '', excerpt: '', content: '', author: '' };
    return {
      title: language === 'ar' && insight.title_ar ? insight.title_ar : insight.title_en,
      excerpt: language === 'ar' && insight.excerpt_ar ? insight.excerpt_ar : insight.excerpt_en,
      content: language === 'ar' && insight.content_ar ? insight.content_ar : insight.content_en,
      author: language === 'ar' && insight.author_ar ? insight.author_ar : insight.author_en,
    };
  };

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

  const content = getLocalizedContent();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-12 w-3/4 mb-8" />
            <Skeleton className="h-6 w-48 mb-12" />
            <Skeleton className="h-64 w-full mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 pb-16">
          <div className="container mx-auto px-4 lg:px-8 text-center">
            <h1 className="font-serif text-3xl font-medium text-foreground mb-4">
              {isRTL ? "المقال غير موجود" : "Article Not Found"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isRTL 
                ? "عذراً، المقال الذي تبحث عنه غير موجود."
                : "Sorry, the article you're looking for doesn't exist."
              }
            </p>
            <Link to="/insights">
              <Button>
                <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
                {isRTL ? "العودة إلى المقالات" : "Back to Insights"}
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <Link 
            to="/insights" 
            className={cn(
              "inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground mb-6 text-sm transition-colors",
              isRTL && "flex-row-reverse"
            )}
          >
            <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
            {isRTL ? "العودة إلى المقالات" : "Back to Insights"}
          </Link>
          
          <div className="inline-block px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium tracking-wide mb-4">
            {getCategoryLabel(insight.category)}
          </div>
          
          <h1 className={cn(
            "font-serif text-3xl md:text-4xl lg:text-5xl font-medium mb-6 leading-tight",
            isRTL && "font-arabic text-right"
          )}>
            {content.title}
          </h1>
          
          {content.excerpt && (
            <p className={cn(
              "text-primary-foreground/80 text-lg leading-relaxed mb-8",
              isRTL && "text-right"
            )}>
              {content.excerpt}
            </p>
          )}
          
          <div className={cn(
            "flex flex-wrap items-center gap-6 text-sm text-primary-foreground/70",
            isRTL && "flex-row-reverse"
          )}>
            {content.author && (
              <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                <User className={cn("h-4 w-4", isRTL ? "ml-1.5" : "mr-1.5")} />
                {content.author}
              </div>
            )}
            {insight.published_at && (
              <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                <Calendar className={cn("h-4 w-4", isRTL ? "ml-1.5" : "mr-1.5")} />
                {format(new Date(insight.published_at), 'MMMM d, yyyy')}
              </div>
            )}
            {insight.read_time_minutes && (
              <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                <Clock className={cn("h-4 w-4", isRTL ? "ml-1.5" : "mr-1.5")} />
                {insight.read_time_minutes} {isRTL ? "دقائق للقراءة" : "min read"}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {insight.featured_image && (
        <section className="bg-background">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <div className="-mt-8 rounded-xl overflow-hidden shadow-elegant">
              <img 
                src={insight.featured_image} 
                alt={content.title}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Article Content */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <article 
            className={cn(
              "prose prose-lg max-w-none",
              "prose-headings:font-serif prose-headings:text-foreground",
              "prose-p:text-muted-foreground prose-p:leading-relaxed",
              "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
              "prose-strong:text-foreground",
              "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
              "prose-blockquote:border-accent prose-blockquote:text-foreground/80",
              isRTL && "text-right font-arabic"
            )}
            dangerouslySetInnerHTML={{ __html: content.content || '' }}
          />
        </div>
      </section>

      {/* Share Section */}
      <section className="py-8 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <div className={cn(
            "flex items-center justify-between",
            isRTL && "flex-row-reverse"
          )}>
            <p className="text-muted-foreground text-sm">
              {isRTL ? "شارك هذا المقال" : "Share this article"}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: content.title,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
            >
              <Share2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? "مشاركة" : "Share"}
            </Button>
          </div>
        </div>
      </section>

      {/* Back to Insights CTA */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl text-center">
          <Link to="/insights">
            <Button variant="outline" size="lg">
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {isRTL ? "عرض جميع المقالات" : "View All Articles"}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InsightDetail;
