import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Insights = () => {
  const articles = [
    {
      category: "Dubai Market",
      title: "Dubai Real Estate Trends to Watch in 2026",
      excerpt: "Key market dynamics and emerging opportunities for investors in Dubai's evolving property landscape.",
      date: "January 5, 2026",
      readTime: "5 min read"
    },
    {
      category: "Investment Guide",
      title: "First-Time Property Investment in UAE: What You Need to Know",
      excerpt: "Essential considerations for new investors entering the UAE real estate market.",
      date: "January 2, 2026",
      readTime: "7 min read"
    },
    {
      category: "Property Trends",
      title: "Off-Plan vs Ready Properties: Making the Right Choice",
      excerpt: "Comparing investment strategies and understanding the pros and cons of each approach.",
      date: "December 28, 2025",
      readTime: "6 min read"
    }
  ];

  return (
    <section id="insights" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Market Insights
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            Latest from Our Team
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Stay informed with our expert analysis and insights on the UAE real estate market.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {articles.map((article, index) => (
            <article
              key={index}
              className="group bg-card border border-border rounded-xl p-6 hover:border-accent/30 transition-all duration-300 hover:shadow-elegant cursor-pointer"
            >
              <div className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium tracking-wide mb-4">
                {article.category}
              </div>
              <h3 className="font-serif text-lg font-medium text-foreground mb-3 group-hover:text-accent transition-colors leading-snug">
                {article.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <span>{article.date}</span>
                </div>
                <span>{article.readTime}</span>
              </div>
            </article>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Link to="/insights">
            <Button variant="outline" size="lg" className="border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-sm font-medium tracking-wide">
              View All Insights
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Insights;
