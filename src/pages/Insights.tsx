import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, ArrowLeft, Search, TrendingUp, Building, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const InsightsPage = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    { name: "All", icon: FileText },
    { name: "Dubai Market", icon: Building },
    { name: "Investment Guide", icon: TrendingUp },
    { name: "Property Trends", icon: MapPin },
  ];

  const featuredArticle = {
    category: "Dubai Market",
    title: "Dubai Real Estate Market Outlook 2026: Key Trends and Opportunities",
    excerpt: "As we enter 2026, Dubai's real estate market continues to demonstrate remarkable resilience and growth. With new infrastructure projects, regulatory reforms, and sustained demand from international investors, the emirate remains one of the world's most attractive property investment destinations. In this comprehensive analysis, we explore the key trends shaping the market and identify the most promising opportunities for investors.",
    date: "January 8, 2026",
    readTime: "12 min read",
    author: "Asas Invest Research Team"
  };

  const articles = [
    {
      category: "Investment Guide",
      title: "First-Time Property Investment in UAE: A Complete Beginner's Guide",
      excerpt: "Everything you need to know before making your first property investment in the UAE, from legal requirements to financing options.",
      date: "January 5, 2026",
      readTime: "8 min read"
    },
    {
      category: "Property Trends",
      title: "Off-Plan vs Ready Properties: Making the Right Investment Choice",
      excerpt: "A detailed comparison of off-plan and ready property investments, helping you understand the risks and rewards of each approach.",
      date: "January 2, 2026",
      readTime: "6 min read"
    },
    {
      category: "Dubai Market",
      title: "Top 5 Emerging Neighborhoods for Property Investment in Dubai",
      excerpt: "Discover the up-and-coming areas in Dubai that offer the best potential for capital appreciation and rental yields.",
      date: "December 28, 2025",
      readTime: "7 min read"
    },
    {
      category: "Investment Guide",
      title: "Understanding Golden Visa Through Property Investment",
      excerpt: "A comprehensive guide to obtaining UAE Golden Visa through real estate investment, including eligibility criteria and benefits.",
      date: "December 22, 2025",
      readTime: "5 min read"
    },
    {
      category: "Property Trends",
      title: "The Rise of Sustainable Buildings in Dubai's Property Market",
      excerpt: "How green building certifications and sustainability features are influencing property values and buyer preferences.",
      date: "December 18, 2025",
      readTime: "6 min read"
    },
    {
      category: "Dubai Market",
      title: "Commercial Real Estate: Office Space Demand in Post-Pandemic Dubai",
      excerpt: "Analyzing the evolving demand for commercial properties as businesses adapt to hybrid work models.",
      date: "December 15, 2025",
      readTime: "8 min read"
    },
    {
      category: "Investment Guide",
      title: "Rental Yield Optimization: Maximizing Returns on Your Dubai Property",
      excerpt: "Practical strategies for landlords to increase rental income and minimize vacancy periods.",
      date: "December 10, 2025",
      readTime: "7 min read"
    },
    {
      category: "Property Trends",
      title: "Smart Home Technology: Impact on Property Values in UAE",
      excerpt: "How smart home features and IoT integration are becoming essential selling points in the luxury property segment.",
      date: "December 5, 2025",
      readTime: "5 min read"
    }
  ];

  const filteredArticles = activeCategory === "All" 
    ? articles 
    : articles.filter(article => article.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Market Insights
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-6 max-w-3xl">
            Expert Analysis & Market Intelligence
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl leading-relaxed">
            Stay informed with our latest research, market reports, and investment insights 
            covering Dubai and the UAE real estate landscape.
          </p>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 border-b border-border bg-background sticky top-20 z-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === category.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <category.icon className="h-4 w-4 mr-2" />
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search articles..." 
                className="pl-10 bg-secondary border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {activeCategory === "All" && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="bg-secondary/50 rounded-2xl p-8 md:p-12 hover:bg-secondary/70 transition-colors duration-300 cursor-pointer group">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3">
                  <div className="inline-block px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium tracking-wide mb-4">
                    Featured • {featuredArticle.category}
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground mb-4 group-hover:text-accent transition-colors">
                    {featuredArticle.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {featuredArticle.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      {featuredArticle.date}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1.5" />
                      {featuredArticle.readTime}
                    </div>
                    <span className="text-foreground/60">By {featuredArticle.author}</span>
                  </div>
                </div>
                <div className="lg:w-1/3 flex items-center justify-center lg:justify-end">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Read Full Article
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Articles Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl font-medium text-foreground">
              {activeCategory === "All" ? "Latest Articles" : activeCategory}
            </h2>
            <span className="text-muted-foreground text-sm">
              {filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => (
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
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-3">
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

          {filteredArticles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No articles found in this category.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground mb-4">
              Stay Updated with Market Insights
            </h2>
            <p className="text-muted-foreground mb-8">
              Subscribe to our newsletter for weekly market updates, investment tips, and exclusive property opportunities.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-background border-border flex-1"
              />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">
              By subscribing, you agree to receive marketing communications from Asas Invest.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InsightsPage;
