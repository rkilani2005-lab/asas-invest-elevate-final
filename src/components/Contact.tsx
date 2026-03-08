import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MapPin, MessageCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function submitForm(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/form-submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const Contact = () => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState("contact");

  // Shared states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: "", email: "", phone: "", subject: "", message: "", language: "en", consent: false,
  });

  // Callback form
  const [callbackForm, setCallbackForm] = useState({
    name: "", phone: "", callback_time: "morning", note: "",
  });

  // Newsletter form
  const [newsletterForm, setNewsletterForm] = useState({
    email: "", name: "", language: "en",
  });
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  const contactInfo = [
    { icon: Phone, label: "Phone", details: "+971 4 XXX XXXX", link: "tel:+97140000000" },
    { icon: MessageCircle, label: "WhatsApp", details: "+971 50 XXX XXXX", link: "https://wa.me/971500000000" },
    { icon: Mail, label: "Email", details: "info@asas.ae", link: "mailto:info@asas.ae" },
    { icon: MapPin, label: "Office", details: "Business Bay, Dubai, UAE", link: "#" },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.consent) {
      toast.error("Please agree to receive communications from ASAS.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await submitForm({
        form_type: "contact",
        visitor_name: contactForm.name,
        visitor_email: contactForm.email,
        visitor_phone: contactForm.phone,
        visitor_message: contactForm.message,
        subject: contactForm.subject,
        preferred_language: contactForm.language,
        consent_given: contactForm.consent,
        source_page: window.location.pathname,
      });
      if (result.success) {
        setSubmitted(true);
        toast.success("Message sent! We'll respond within 24 hours.");
        setContactForm({ name: "", email: "", phone: "", subject: "", message: "", language: "en", consent: false });
      } else {
        toast.error(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitForm({
        form_type: "callback",
        visitor_name: callbackForm.name,
        visitor_email: "callback@asas.ae", // placeholder for callback-only
        visitor_phone: callbackForm.phone,
        visitor_message: callbackForm.note,
        callback_time: callbackForm.callback_time,
        source_page: window.location.pathname,
        consent_given: true,
      });
      if (result.success) {
        toast.success("Callback requested! We'll call you within 2 hours.");
        setCallbackForm({ name: "", phone: "", callback_time: "morning", note: "" });
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitForm({
        form_type: "newsletter",
        visitor_email: newsletterForm.email,
        visitor_name: newsletterForm.name,
        preferred_language: newsletterForm.language,
        consent_given: true,
        source_page: window.location.pathname,
      });
      if (result.success) {
        setNewsletterSubmitted(true);
        toast.success("Subscribed! Welcome to the ASAS community.");
      } else {
        toast.error(result.error || "Something went wrong.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-background grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8 relative z-10", isRTL && "font-arabic")}>
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">{t("contact.title")}</p>
          <h2 className="heading-section text-3xl md:text-4xl text-accent mb-6">
            {t("contact.subtitle")}
          </h2>
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
                  className="border border-accent/30 p-5 flex items-start gap-4 group hover:border-accent transition-all duration-300 block bg-white shadow-card"
                >
                  <div className="w-10 h-10 border border-accent/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-accent transition-colors duration-300">
                    <info.icon className="h-5 w-5 text-accent" strokeWidth={1} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm mb-0.5">{info.label}</div>
                    <div className="text-muted-foreground text-sm">{info.details}</div>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Form Area */}
          <ScrollReveal direction={isRTL ? "left" : "right"} className="lg:col-span-2">
            <div className="bg-white border border-accent/30 shadow-card">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSubmitted(false); }}>
                <TabsList className="w-full rounded-none border-b border-accent/20 bg-transparent h-auto p-0">
                  {[
                    { id: "contact", label: "General Inquiry" },
                    { id: "callback", label: "Request Callback" },
                    { id: "newsletter", label: "Newsletter" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent py-3 text-sm font-medium transition-all"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* GENERAL INQUIRY */}
                <TabsContent value="contact" className="p-8 mt-0">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground">Our team will respond within 24 hours. Check your email for a confirmation.</p>
                      <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Full Name *
                          </label>
                          <Input
                            placeholder="Your full name"
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            required
                            className="bg-white border-accent/30 focus:border-accent rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Email Address *
                          </label>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            required
                            className="bg-white border-accent/30 focus:border-accent rounded-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Phone Number
                          </label>
                          <Input
                            type="tel"
                            placeholder="+971 XX XXX XXXX"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            className="bg-white border-accent/30 focus:border-accent rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Subject
                          </label>
                          <Select value={contactForm.subject} onValueChange={(v) => setContactForm({ ...contactForm, subject: v })}>
                            <SelectTrigger className="bg-white border-accent/30 rounded-none focus:border-accent">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="property">Property Information</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="media">Media & Press</SelectItem>
                              <SelectItem value="careers">Careers</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          Message *
                        </label>
                        <Textarea
                          placeholder="Tell us how we can help..."
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          required
                          className="bg-white border-accent/30 focus:border-accent resize-none rounded-none"
                        />
                      </div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="consent"
                          checked={contactForm.consent}
                          onChange={(e) => setContactForm({ ...contactForm, consent: e.target.checked })}
                          className="mt-0.5 w-4 h-4 accent-[hsl(var(--accent))] cursor-pointer"
                        />
                        <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                          I agree to receive communications from ASAS Real Estate. Your data is handled per our{" "}
                          <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
                        </label>
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        variant="luxury"
                        className="w-full rounded-none"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : t("buttons.submit")}
                      </Button>
                    </form>
                  )}
                </TabsContent>

                {/* CALLBACK */}
                <TabsContent value="callback" className="p-8 mt-0">
                  <p className="text-sm text-muted-foreground mb-6">
                    Leave your number and our team will call you back within 2 business hours (Sun–Thu, 9 AM–6 PM GST).
                  </p>
                  <form onSubmit={handleCallbackSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          Full Name *
                        </label>
                        <Input
                          placeholder="Your full name"
                          value={callbackForm.name}
                          onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })}
                          required
                          className="bg-white border-accent/30 focus:border-accent rounded-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                          Phone Number *
                        </label>
                        <Input
                          type="tel"
                          placeholder="+971 XX XXX XXXX"
                          value={callbackForm.phone}
                          onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })}
                          required
                          className="bg-white border-accent/30 focus:border-accent rounded-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        Best Time to Call
                      </label>
                      <Select value={callbackForm.callback_time} onValueChange={(v) => setCallbackForm({ ...callbackForm, callback_time: v })}>
                        <SelectTrigger className="bg-white border-accent/30 rounded-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">ASAP</SelectItem>
                          <SelectItem value="morning">Morning (9 AM–12 PM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12 PM–3 PM)</SelectItem>
                          <SelectItem value="evening">Evening (3 PM–6 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                        Brief Note (optional)
                      </label>
                      <Textarea
                        placeholder="Property of interest, questions, etc."
                        rows={3}
                        value={callbackForm.note}
                        onChange={(e) => setCallbackForm({ ...callbackForm, note: e.target.value })}
                        className="bg-white border-accent/30 focus:border-accent resize-none rounded-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      variant="luxury"
                      className="w-full rounded-none"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Requesting...</> : "Request Callback"}
                    </Button>
                  </form>
                </TabsContent>

                {/* NEWSLETTER */}
                <TabsContent value="newsletter" className="p-8 mt-0">
                  {newsletterSubmitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to ASAS!</h3>
                      <p className="text-muted-foreground">You'll receive exclusive Dubai property updates and market insights.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-6">
                        Subscribe for curated updates on Dubai's most exclusive properties, market insights, and early access to new launches.
                      </p>
                      <form onSubmit={handleNewsletterSubmit} className="space-y-5">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Name (optional)
                          </label>
                          <Input
                            placeholder="Your name"
                            value={newsletterForm.name}
                            onChange={(e) => setNewsletterForm({ ...newsletterForm, name: e.target.value })}
                            className="bg-white border-accent/30 focus:border-accent rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Email Address *
                          </label>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={newsletterForm.email}
                            onChange={(e) => setNewsletterForm({ ...newsletterForm, email: e.target.value })}
                            required
                            className="bg-white border-accent/30 focus:border-accent rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Preferred Language
                          </label>
                          <Select value={newsletterForm.language} onValueChange={(v) => setNewsletterForm({ ...newsletterForm, language: v })}>
                            <SelectTrigger className="bg-white border-accent/30 rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="ar">العربية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="submit"
                          size="lg"
                          variant="luxury"
                          className="w-full rounded-none"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subscribing...</> : "Subscribe"}
                        </Button>
                      </form>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
