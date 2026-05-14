import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Camera, Megaphone, KeyRound } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const timelineSteps = [
  { icon: ClipboardCheck, labelKey: "sell.step1" },
  { icon: Camera, labelKey: "sell.step2" },
  { icon: Megaphone, labelKey: "sell.step3" },
  { icon: KeyRound, labelKey: "sell.step4" },
];

const Sell = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", area: "", propertyType: "", size: "", message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: `Area: ${form.area}, Type: ${form.propertyType}, Size: ${form.size}. ${form.message}`,
      inquiry_type: "valuation",
    });
    setLoading(false);
    if (error) {
      toast({ title: t("common.error"), description: t("common.errorMessage"), variant: "destructive" });
    } else {
      toast({ title: t("sell.successTitle"), description: t("sell.successDesc") });
      setForm({ name: "", email: "", phone: "", area: "", propertyType: "", size: "", message: "" });
    }
  }

  return (<>
      <SEOHead
        title={t("seo.sell.title")}
        description={t("seo.sell.description")}
        canonical="https://asasinvest.com/sell"
        jsonLd={breadcrumbJsonLd([
          { name: t("seo.breadcrumb.home"), url: "https://asasinvest.com" },
          { name: t("seo.breadcrumb.sell") },
        ])}
      />
    <div className="min-h-screen bg-background grain-overlay">
      <Navigation />
      <main className="pt-24 pb-16 relative z-10">
        <div className={cn("container mx-auto px-4 lg:px-8", isRTL && "font-arabic")}>
          <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
            <p className="text-eyebrow text-accent mb-4">{t("sell.subtitle")}</p>
            <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">{t("sell.title")}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("sell.description")}</p>
          </ScrollReveal>

          {/* Two-path chooser — make the difference obvious */}
          <div className="max-w-5xl mx-auto mb-16 grid md:grid-cols-2 gap-6">
            <div className="card-luxury p-6 md:p-8 flex flex-col">
              <p className="text-eyebrow text-accent mb-2">{t("sell.path1Eyebrow")}</p>
              <h2 className="heading-section text-xl md:text-2xl text-foreground mb-3">
                {t("sell.path1Title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                {t("sell.path1Desc")}
              </p>
              <Button asChild variant="outline" className="self-start">
                <a href="#valuation-form">{t("sell.path1Cta")}</a>
              </Button>
            </div>
            <div className="card-luxury p-6 md:p-8 flex flex-col border-accent/40">
              <p className="text-eyebrow text-accent mb-2">{t("sell.path2Eyebrow")}</p>
              <h2 className="heading-section text-xl md:text-2xl text-foreground mb-3">
                {t("sell.path2Title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                {t("sell.path2Desc")}
              </p>
              <Button asChild variant="luxury" className="self-start">
                <Link to="/list-property">{t("sell.path2Cta")}</Link>
              </Button>
            </div>
          </div>

          {/* Process Timeline */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 border border-accent/30 flex items-center justify-center mb-4 relative">
                    <step.icon className="h-7 w-7 text-accent" strokeWidth={1} />
                    <span className="absolute -top-2 -end-2 w-6 h-6 bg-accent text-accent-foreground text-xs flex items-center justify-center font-mediumum">
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{t(step.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation Form */}
          <div id="valuation-form" className="max-w-2xl mx-auto scroll-mt-24">
            <div className="card-luxury p-8">
              <h2 className="heading-section text-xl text-foreground mb-6 text-center">{t("sell.formTitle")}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("contact.name")}</Label>
                    <Input required value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("contact.email")}</Label>
                    <Input required type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("contact.phone")}</Label>
                    <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("sell.area")}</Label>
                    <Input value={form.area} onChange={(e) => setForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g., Dubai Marina" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("sell.propertyType")}</Label>
                    <Select value={form.propertyType} onValueChange={(v) => setForm(p => ({ ...p, propertyType: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("sell.selectType")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">{t("propertyTypes.apartment")}</SelectItem>
                        <SelectItem value="villa">{t("propertyTypes.villa")}</SelectItem>
                        <SelectItem value="townhouse">{t("propertyTypes.townhouse")}</SelectItem>
                        <SelectItem value="penthouse">{t("propertyTypes.penthouse")}</SelectItem>
                        <SelectItem value="office">{t("propertyTypes.office")}</SelectItem>
                        <SelectItem value="retail">{t("propertyTypes.retail")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("sell.size")}</Label>
                    <Input value={form.size} onChange={(e) => setForm(p => ({ ...p, size: e.target.value }))} placeholder="e.g., 1,200 sqft" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("contact.message")}</Label>
                  <Textarea value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} rows={3} />
                </div>
                <Button type="submit" variant="luxury" className="w-full" disabled={loading}>
                  {loading ? "..." : t("sell.submitValuation")}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  </>);
};

export default Sell;
