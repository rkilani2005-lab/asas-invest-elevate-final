import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "Thank you for your inquiry. We'll be in touch shortly.",
    });
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      details: "+971 4 XXX XXXX",
      link: "tel:+97140000000"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      details: "+971 50 XXX XXXX",
      link: "https://wa.me/971500000000"
    },
    {
      icon: Mail,
      title: "Email",
      details: "info@asasinvest.ae",
      link: "mailto:info@asasinvest.ae"
    },
    {
      icon: MapPin,
      title: "Office",
      details: "Business Bay, Dubai, UAE",
      link: "#"
    }
  ];

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-accent text-sm font-medium tracking-widest uppercase mb-4">
            Get in Touch
          </p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium text-foreground mb-6">
            Let's Discuss Your Investment Goals
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ready to start your real estate investment journey? Our team is here to help.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <StaggerContainer className="space-y-4">
            {contactInfo.map((info, index) => (
              <StaggerItem key={index}>
                <a
                  href={info.link}
                  target={info.link.startsWith("http") ? "_blank" : undefined}
                  rel={info.link.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="bg-secondary/50 rounded-xl p-5 flex items-start space-x-4 group hover:bg-secondary transition-all duration-300 block"
                >
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors duration-300">
                    <info.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm mb-0.5">{info.title}</div>
                    <div className="text-muted-foreground text-sm">{info.details}</div>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Contact Form */}
          <ScrollReveal direction="right" className="lg:col-span-2">
            <div className="bg-secondary/50 rounded-xl p-8 h-full">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      required
                      className="bg-background border-border focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      className="bg-background border-border focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    className="bg-background border-border focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    How can we help?
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your investment interests..."
                    rows={4}
                    required
                    className="bg-background border-border focus:border-accent transition-colors resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 text-sm font-medium tracking-wide"
                >
                  Send Message
                </Button>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
