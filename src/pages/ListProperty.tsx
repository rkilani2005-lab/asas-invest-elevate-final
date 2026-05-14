import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Upload, X, Loader2, Video, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 10;
const MAX_FILE_MB = 8;

const ListProperty = () => {
  const { t, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [form, setForm] = useState({
    seller_name: "",
    seller_email: "",
    seller_phone: "",
    preferred_language: language,
    property_name_en: "",
    property_name_ar: "",
    category: "residential",
    unit_type: "",
    location_en: "",
    location_ar: "",
    developer_en: "",
    developer_ar: "",
    bedrooms: "",
    bathrooms: "",
    size_sqft: "",
    price_aed: "",
    description_en: "",
    description_ar: "",
    video_url: "",
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${f.name} exceeds ${MAX_FILE_MB}MB`,
          variant: "destructive",
        });
        return false;
      }
      return f.type.startsWith("image/");
    });
    setPhotos((prev) => [...prev, ...valid].slice(0, MAX_PHOTOS));
    e.target.value = "";
  };

  const removePhoto = (i: number) =>
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const uploadPhotos = async (submissionId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `seller-submissions/${submissionId}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("property-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seller_name || !form.seller_email || !form.property_name_en) {
      toast({
        title: t("listProperty.errorTitle"),
        description: t("listProperty.required"),
        variant: "destructive",
      });
      return;
    }
    // Light validation: if a video URL is provided it must look like a URL.
    if (form.video_url && !/^https?:\/\/\S+$/i.test(form.video_url.trim())) {
      toast({
        title: t("listProperty.errorTitle"),
        description: t("listProperty.invalidVideoUrl"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Insert submission to get id
      const { data: inserted, error: insErr } = await supabase
        .from("seller_submissions")
        .insert([{ ...form, video_url: form.video_url.trim() || null, photos: [] }])
        .select("id")
        .single();
      if (insErr) throw insErr;

      // 2. Upload photos under that id
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos(inserted.id);
        await supabase
          .from("seller_submissions")
          .update({ photos: photoUrls })
          .eq("id", inserted.id);
      }

      toast({
        title: t("listProperty.successTitle"),
        description: t("listProperty.successDesc"),
      });
      // Show in-page success card instead of bouncing back to /sell.
      setSubmittedId(inserted.id);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: t("listProperty.errorTitle"),
        description: t("listProperty.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title={t("listProperty.title") + " | Asas Invest"}
        description={t("listProperty.description")}
        canonical="https://asasinvest.com/list-property"
        jsonLd={breadcrumbJsonLd([
          { name: t("seo.breadcrumb.home"), url: "https://asasinvest.com" },
          { name: t("seo.breadcrumb.sell"), url: "https://asasinvest.com/sell" },
          { name: t("listProperty.title") },
        ])}
      />
      <div className="min-h-screen bg-background grain-overlay">
        <Navigation />
        <main className="pt-24 pb-16 relative z-10">
          <div
            className={cn(
              "container mx-auto px-4 lg:px-8",
              isRTL && "font-arabic text-end"
            )}
          >
            <ScrollReveal className="max-w-3xl mx-auto text-center mb-12">
              <p className="text-eyebrow text-accent mb-4">
                {t("listProperty.subtitle")}
              </p>
              <h1 className="heading-hero text-3xl md:text-4xl lg:text-5xl text-accent mb-6">
                {t("listProperty.title")}
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t("listProperty.description")}
              </p>
            </ScrollReveal>

            {submittedId ? (
              <div className="max-w-2xl mx-auto card-luxury p-8 md:p-12 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/15 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-accent" strokeWidth={1.25} />
                </div>
                <div className="space-y-3">
                  <h2 className="heading-section text-2xl md:text-3xl text-foreground">
                    {t("listProperty.thanksTitle")}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("listProperty.thanksBody")}
                  </p>
                  <p className="text-xs text-muted-foreground/70" dir="ltr">
                    {t("listProperty.referenceLabel")}: {submittedId.slice(0, 8)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild variant="luxury">
                    <Link to="/">{t("listProperty.backHome")}</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmittedId(null);
                      setPhotos([]);
                      setForm((p) => ({
                        ...p,
                        property_name_en: "",
                        property_name_ar: "",
                        location_en: "",
                        location_ar: "",
                        developer_en: "",
                        developer_ar: "",
                        bedrooms: "",
                        bathrooms: "",
                        size_sqft: "",
                        price_aed: "",
                        description_en: "",
                        description_ar: "",
                        video_url: "",
                      }));
                    }}
                  >
                    {t("listProperty.submitAnother")}
                  </Button>
                </div>
              </div>
            ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto card-luxury p-6 md:p-10 space-y-10"
            >
              {/* Contact */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionContact")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={t("listProperty.sellerName") + " *"}>
                    <Input
                      required
                      value={form.seller_name}
                      onChange={(e) => update("seller_name", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.sellerEmail") + " *"}>
                    <Input
                      required
                      type="email"
                      value={form.seller_email}
                      onChange={(e) => update("seller_email", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.sellerPhone")}>
                    <Input
                      value={form.seller_phone}
                      onChange={(e) => update("seller_phone", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.preferredLanguage")}>
                    <Select
                      value={form.preferred_language}
                      onValueChange={(v) => update("preferred_language", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </section>

              {/* Property */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionProperty")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={t("listProperty.propertyNameEn") + " *"}>
                    <Input
                      required
                      value={form.property_name_en}
                      onChange={(e) =>
                        update("property_name_en", e.target.value)
                      }
                    />
                  </Field>
                  <Field label={t("listProperty.propertyNameAr")}>
                    <Input
                      dir="rtl"
                      value={form.property_name_ar}
                      onChange={(e) =>
                        update("property_name_ar", e.target.value)
                      }
                    />
                  </Field>
                  <Field label={t("listProperty.category")}>
                    <Select
                      value={form.category}
                      onValueChange={(v) => update("category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">
                          {t("listProperty.residential")}
                        </SelectItem>
                        <SelectItem value="commercial">
                          {t("listProperty.commercial")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("listProperty.unitType")}>
                    <Select
                      value={form.unit_type}
                      onValueChange={(v) => update("unit_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("listProperty.selectUnitType")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {form.category === "residential" ? (
                          <>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="penthouse">Penthouse</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="warehouse">Warehouse</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("listProperty.locationEn")}>
                    <Input
                      value={form.location_en}
                      onChange={(e) => update("location_en", e.target.value)}
                      placeholder="e.g., Dubai Marina"
                    />
                  </Field>
                  <Field label={t("listProperty.locationAr")}>
                    <Input
                      dir="rtl"
                      value={form.location_ar}
                      onChange={(e) => update("location_ar", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.developerEn")}>
                    <Input
                      value={form.developer_en}
                      onChange={(e) => update("developer_en", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.developerAr")}>
                    <Input
                      dir="rtl"
                      value={form.developer_ar}
                      onChange={(e) => update("developer_ar", e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              {/* Specs */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionDetails")}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label={t("listProperty.bedrooms")}>
                    <Input
                      value={form.bedrooms}
                      onChange={(e) => update("bedrooms", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.bathrooms")}>
                    <Input
                      value={form.bathrooms}
                      onChange={(e) => update("bathrooms", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.size")}>
                    <Input
                      value={form.size_sqft}
                      onChange={(e) => update("size_sqft", e.target.value)}
                    />
                  </Field>
                  <Field label={t("listProperty.price")}>
                    <Input
                      value={form.price_aed}
                      onChange={(e) => update("price_aed", e.target.value)}
                    />
                  </Field>
                </div>
              </section>

              {/* Description */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionDescription")}
                </h2>
                <Field label={t("listProperty.descriptionEn")}>
                  <Textarea
                    rows={4}
                    value={form.description_en}
                    onChange={(e) => update("description_en", e.target.value)}
                  />
                </Field>
                <Field label={t("listProperty.descriptionAr")}>
                  <Textarea
                    dir="rtl"
                    rows={4}
                    value={form.description_ar}
                    onChange={(e) => update("description_ar", e.target.value)}
                  />
                </Field>
              </section>

              {/* Photos */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionPhotos")}
                </h2>
                <label className="block border-2 border-dashed border-accent/40 hover:border-accent rounded-lg p-8 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                    disabled={photos.length >= MAX_PHOTOS}
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-accent" strokeWidth={1} />
                  <p className="text-sm font-medium text-foreground">
                    {t("listProperty.uploadPhotos")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("listProperty.uploadHint")} ({photos.length}/{MAX_PHOTOS})
                  </p>
                </label>

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative aspect-square group">
                        <img
                          src={URL.createObjectURL(p)}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 end-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Video */}
              <section className="space-y-4">
                <h2 className="heading-section text-xl text-foreground border-b border-accent/20 pb-2">
                  {t("listProperty.sectionVideo")}
                </h2>
                <p className="text-sm text-muted-foreground -mt-1">
                  {t("listProperty.videoHint")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="video_url">
                    {t("listProperty.videoUrl")}
                  </Label>
                  <div className="relative">
                    <Video
                      className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none"
                      strokeWidth={1.5}
                    />
                    <Input
                      id="video_url"
                      type="url"
                      inputMode="url"
                      dir="ltr"
                      placeholder="https://youtube.com/watch?v=…  or  https://vimeo.com/…"
                      className="ps-9"
                      value={form.video_url}
                      onChange={(e) => update("video_url", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Button
                type="submit"
                variant="luxury"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t("listProperty.submitting")}
                  </>
                ) : (
                  t("listProperty.submit")
                )}
              </Button>
            </form>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);

export default ListProperty;
