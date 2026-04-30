import { useState } from "react";
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
  const { t, isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("contact");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: "", email: "", phone: "", subject: "", message: "", language: "en", consent: false,
  });

  const [callbackForm, setCallbackForm] = useState({
    name: "", phone: "", callback_time: "morning", note: "",
  });

  const [newsletterForm, setNewsletterForm] = useState({
    email: "", name: "", language: "en",
  });
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Phone numbers and emails are shown LTR even in RTL via .ltr-numeric
  const contactInfo = [
    { icon: Phone, label: t("contact.infoPhone"), details: "+971 4 XXX XXXX", link: "tel:+97140000000", ltr: true },
    { icon: MessageCircle, label: t("contact.infoWhatsApp"), details: "+971 50 XXX XXXX", link: "https://wa.me/971500000000", ltr: true },
    { icon: Mail, label: t("contact.infoEmail"), details: "admin@asasinvest.com", link: "mailto:admin@asasinvest.com", ltr: true },
    { icon: MapPin, label: t("contact.infoOffice"), details: t("contact.officeAddress"), link: "#", ltr: false },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.consent) {
      toast.error(t("contact.consentRequired"));
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
        preferred_language: language,
        consent_given: contactForm.consent,
        source_page: window.location.pathname,
      });
      if (result.success) {
        setSubmitted(true);
        toast.success(t("contact.successToast"));
        setContactForm({ name: "", email: "", phone: "", subject: "", message: "", language: "en", consent: false });
      } else {
        toast.error(result.error || t("contact.errorGeneric"));
      }
    } catch {
      toast.error(t("contact.errorNetwork"));
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
        visitor_email: "callback@asasinvest.com",
        visitor_phone: callbackForm.phone,
        visitor_message: callbackForm.note,
        callback_time: callbackForm.callback_time,
        source_page: window.location.pathname,
        consent_given: true,
      });
      if (result.success) {
        toast.success(t("contact.callbackSuccess"));
        setCallbackForm({ name: "", phone: "", callback_time: "morning", note: "" });
      } else {
        toast.error(result.error || t("contact.errorGeneric"));
      }
    } catch {
      toast.error(t("contact.errorNetwork"));
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
        toast.success(t("contact.newsletterSuccess"));
      } else {
        toast.error(result.error || t("contact.errorGeneric"));
      }
    } catch {
      toast.error(t("contact.errorNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelCls = "block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider";
  const inputCls = "bg-white border-accent/30 focus:border-accent rounded-none";

  const reqMark = <span className="text-accent ms-0.5" aria-label={t("contact.required")}>*</span>;

  return (
    <section id="contact" className="py-24 bg-background grain-overlay">
      <div className={cn("container mx-auto px-4 lg:px-8 relative z-10", isRTL && "font-arabic")}>
        <ScrollReveal className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-eyebrow text-accent mb-4">{t("contact.title")}</p>
          <h2 className="heading-section text-3xl md:text-4xl text-foreground mb-6">
            {t("contact.subtitle")}
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
                    <div className={cn("text-muted-foreground text-sm", info.ltr && "ltr-numeric")}>
                      {info.details}
                    </div>
                  </div>
                </a>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <ScrollReveal direction={isRTL ? "left" : "right"} className="lg:col-span-2">
            <div className="bg-white border border-accent/30 shadow-card">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSubmitted(false); }}>
                <TabsList className="w-full rounded-none border-b border-accent/20 bg-transparent h-auto p-0">
                  {[
                    { id: "contact", label: t("contact.tabContact") },
                    { id: "callback", label: t("contact.tabCallback") },
                    { id: "newsletter", label: t("contact.tabNewsletter") },
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">{t("contact.messageSent")}</h3>
                      <p className="text-muted-foreground">{t("contact.messageSentDesc")}</p>
                      <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>
                        {t("contact.sendAnother")}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>{t("contact.name")} {reqMark}</label>
                          <Input
                            placeholder={t("contact.namePlaceholder")}
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            required
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("contact.email")} {reqMark}</label>
                          <Input
                            type="email"
                            dir="ltr"
                            placeholder={t("contact.emailPlaceholder")}
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            required
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>{t("contact.phone")}</label>
                          <Input
                            type="tel"
                            dir="ltr"
                            placeholder={t("contact.phonePlaceholder")}
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("contact.subject")}</label>
                          <Select value={contactForm.subject} onValueChange={(v) => setContactForm({ ...contactForm, subject: v })}>
                            <SelectTrigger className={inputCls}>
                              <SelectValue placeholder={t("contact.subjectPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">{t("contact.subjectGeneral")}</SelectItem>
                              <SelectItem value="property">{t("contact.subjectProperty")}</SelectItem>
                              <SelectItem value="partnership">{t("contact.subjectPartnership")}</SelectItem>
                              <SelectItem value="media">{t("contact.subjectMedia")}</SelectItem>
                              <SelectItem value="careers">{t("contact.subjectCareers")}</SelectItem>
                              <SelectItem value="other">{t("contact.subjectOther")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t("contact.message")} {reqMark}</label>
                        <Textarea
                          placeholder={t("contact.messagePlaceholder")}
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          required
                          className={cn(inputCls, "resize-none")}
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
                          {t("contact.consentLabel")}{" "}
                          <a href="#" className="text-accent hover:underline">{t("contact.privacyPolicy")}</a>.
                        </label>
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        variant="luxury"
                        className="w-full rounded-none"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("contact.sending")}</> : t("buttons.submit")}
                      </Button>
                    </form>
                  )}
                </TabsContent>

                {/* CALLBACK */}
                <TabsContent value="callback" className="p-8 mt-0">
                  <p className="text-sm text-muted-foreground mb-6">{t("contact.callbackIntro")}</p>
                  <form onSubmit={handleCallbackSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>{t("contact.name")} {reqMark}</label>
                        <Input
                          placeholder={t("contact.namePlaceholder")}
                          value={callbackForm.name}
                          onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })}
                          required
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t("contact.phone")} {reqMark}</label>
                        <Input
                          type="tel"
                          dir="ltr"
                          placeholder={t("contact.phonePlaceholder")}
                          value={callbackForm.phone}
                          onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })}
                          required
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t("contact.callbackTime")}</label>
                      <Select value={callbackForm.callback_time} onValueChange={(v) => setCallbackForm({ ...callbackForm, callback_time: v })}>
                        <SelectTrigger className={inputCls}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">{t("contact.callbackAsap")}</SelectItem>
                          <SelectItem value="morning">{t("contact.callbackMorning")}</SelectItem>
                          <SelectItem value="afternoon">{t("contact.callbackAfternoon")}</SelectItem>
                          <SelectItem value="evening">{t("contact.callbackEvening")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={labelCls}>{t("contact.callbackNote")}</label>
                      <Textarea
                        placeholder={t("contact.callbackNotePlaceholder")}
                        rows={3}
                        value={callbackForm.note}
                        onChange={(e) => setCallbackForm({ ...callbackForm, note: e.target.value })}
                        className={cn(inputCls, "resize-none")}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      variant="luxury"
                      className="w-full rounded-none"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("contact.callbackRequesting")}</> : t("contact.callbackRequest")}
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">{t("contact.newsletterWelcome")}</h3>
                      <p className="text-muted-foreground">{t("contact.newsletterWelcomeDesc")}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-6">{t("contact.newsletterIntro")}</p>
                      <form onSubmit={handleNewsletterSubmit} className="space-y-5">
                        <div>
                          <label className={labelCls}>{t("contact.newsletterName")}</label>
                          <Input
                            placeholder={t("contact.namePlaceholderShort")}
                            value={newsletterForm.name}
                            onChange={(e) => setNewsletterForm({ ...newsletterForm, name: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("contact.email")} {reqMark}</label>
                          <Input
                            type="email"
                            dir="ltr"
                            placeholder={t("contact.emailPlaceholder")}
                            value={newsletterForm.email}
                            onChange={(e) => setNewsletterForm({ ...newsletterForm, email: e.target.value })}
                            required
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{t("contact.newsletterLanguage")}</label>
                          <Select value={newsletterForm.language} onValueChange={(v) => setNewsletterForm({ ...newsletterForm, language: v })}>
                            <SelectTrigger className={inputCls}>
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
                          {isSubmitting ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("contact.newsletterSubscribing")}</> : t("contact.newsletterSubscribe")}
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
