import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Insights = () => {
  const articles = [
    {
      category: "Market Trends",
      title: "The Future of Luxury Real Estate in Metropolitan Areas",
      excerpt: "Analyzing emerging trends and investment opportunities in premium urban properties.",
      date: "November 8, 2025",
      readTime: "5 min read"
    },
    {
      category: "Investment Strategy",
      title: "Building a Diversified Real Estate Portfolio",
      excerpt: "Key strategies for balancing residential, commercial, and hospitality investments.",
      date: "November 5, 2025",
      readTime: "7 min read"
    },
    {
      category: "Industry Report",
      title: "2025 Real Estate Market Outlook",
      excerpt: "Comprehensive analysis of market dynamics and projected growth sectors.",
      date: "November 1, 2025",
      readTime: "10 min read"
    }
  ];

  return (
    <section id="insights" className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Latest Insights
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert analysis and market intelligence for informed investment decisions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {articles.map((article, index) => (
            <article
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:border-accent transition-all duration-300 hover:shadow-elegant group"
            >
              <div className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-semibold mb-4">
                {article.category}
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                {article.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{article.date}</span>
                </div>
                <span>{article.readTime}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg" className="border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            View All Insights
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Insights;
