import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Instagram, Linkedin, Youtube, Twitter, Facebook } from "lucide-react";
import { toast } from "sonner";

interface SiteSettings {
  contact: {
    phone: string;
    email: string;
    address_en: string;
    address_ar: string;
    whatsapp: string;
  };
  social: {
    instagram: string;
    linkedin: string;
    youtube: string;
    twitter: string;
    facebook: string;
    tiktok: string;
    snapchat: string;
  };
  seo: {
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
    og_image: string;
  };
}

const defaultSettings: SiteSettings = {
  contact: {
    phone: "",
    email: "",
    address_en: "",
    address_ar: "",
    whatsapp: "",
  },
  social: {
    instagram: "",
    linkedin: "",
    youtube: "",
    twitter: "",
    facebook: "",
    tiktok: "",
    snapchat: "",
  },
  seo: {
    title_en: "",
    title_ar: "",
    description_en: "",
    description_ar: "",
    og_image: "",
  },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) {
        toast.error("Failed to load settings");
        setIsLoading(false);
        return;
      }

      const loadedSettings = { ...defaultSettings };
      data?.forEach((row) => {
        if (row.key === "contact") loadedSettings.contact = row.value as typeof loadedSettings.contact;
        if (row.key === "social") loadedSettings.social = row.value as typeof loadedSettings.social;
        if (row.key === "seo") loadedSettings.seo = row.value as typeof loadedSettings.seo;
      });

      setSettings(loadedSettings);
      setIsLoading(false);
    }

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const settingsToSave = [
        { key: "contact", value: settings.contact },
        { key: "social", value: settings.social },
        { key: "seo", value: settings.seo },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" });

        if (error) throw error;
      }

      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (
    category: keyof SiteSettings,
    field: string,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage site-wide configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Update your business contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={settings.contact.phone}
                    onChange={(e) => updateSetting("contact", "phone", e.target.value)}
                    placeholder="+971 4 XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={settings.contact.whatsapp}
                    onChange={(e) => updateSetting("contact", "whatsapp", e.target.value)}
                    placeholder="+971501234567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.contact.email}
                  onChange={(e) => updateSetting("contact", "email", e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_en">Address (English)</Label>
                  <Textarea
                    id="address_en"
                    value={settings.contact.address_en}
                    onChange={(e) => updateSetting("contact", "address_en", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_ar">Address (Arabic)</Label>
                  <Textarea
                    id="address_ar"
                    value={settings.contact.address_ar}
                    onChange={(e) => updateSetting("contact", "address_ar", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Connect your social media profiles. These links will appear in the website footer and contact sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={settings.social.instagram}
                    onChange={(e) => updateSetting("social", "instagram", e.target.value)}
                    placeholder="https://instagram.com/yourprofile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={settings.social.facebook}
                    onChange={(e) => updateSetting("social", "facebook", e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-sky-500" />
                    X (Twitter)
                  </Label>
                  <Input
                    id="twitter"
                    value={settings.social.twitter}
                    onChange={(e) => updateSetting("social", "twitter", e.target.value)}
                    placeholder="https://x.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-700" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    value={settings.social.linkedin}
                    onChange={(e) => updateSetting("social", "linkedin", e.target.value)}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube" className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    YouTube
                  </Label>
                  <Input
                    id="youtube"
                    value={settings.social.youtube}
                    onChange={(e) => updateSetting("social", "youtube", e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    TikTok
                  </Label>
                  <Input
                    id="tiktok"
                    value={settings.social.tiktok}
                    onChange={(e) => updateSetting("social", "tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@yourhandle"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="snapchat" className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.36.36 0 0 1 .163-.039c.088 0 .174.026.251.078.158.103.267.291.267.484 0 .137-.047.27-.138.373-.127.145-.336.245-.565.309-.147.045-.3.078-.45.105-.12.019-.24.039-.36.064-.118.022-.18.066-.2.136-.02.079.007.177.067.3.195.398.494.748.888 1.056 1.092.877 2.505 1.33 3.888 1.5.242.032.385.145.39.322.01.338-.364.64-.93.88-.337.143-.718.226-1.104.244-.243.012-.484.03-.725.06l-.13.02c-.167.029-.346.105-.445.286-.064.116-.147.33-.107.57.024.147.054.292.085.436.063.294.127.588.182.888.04.21-.007.393-.139.538-.193.216-.528.338-.935.338-.14 0-.277-.012-.413-.035-.404-.068-.776-.175-1.132-.309-.335-.126-.648-.263-.933-.376l-.086-.035c-.26-.106-.514-.162-.76-.162a1.7 1.7 0 0 0-.524.077c-.437.131-.9.41-1.338.764a6.6 6.6 0 0 1-1.041.703 3.23 3.23 0 0 1-1.583.404c-.55 0-1.102-.14-1.584-.404a6.63 6.63 0 0 1-1.041-.703c-.438-.354-.9-.633-1.338-.764a1.71 1.71 0 0 0-.524-.077c-.246 0-.5.056-.76.162l-.086.035c-.285.113-.598.25-.933.376-.356.134-.728.24-1.132.309a2.33 2.33 0 0 1-.413.035c-.407 0-.742-.122-.935-.338-.132-.145-.18-.328-.14-.538.056-.3.12-.594.183-.888.03-.144.061-.289.085-.436.04-.24-.043-.454-.107-.57-.1-.181-.278-.257-.445-.286l-.13-.02c-.24-.03-.482-.048-.724-.06-.387-.018-.768-.101-1.105-.244-.565-.24-.94-.542-.93-.88.005-.177.148-.29.39-.322 1.383-.17 2.796-.623 3.888-1.5.394-.308.693-.658.888-1.056.06-.123.087-.221.067-.3-.02-.07-.082-.114-.2-.136-.12-.025-.24-.045-.36-.064-.15-.027-.303-.06-.45-.105-.23-.064-.438-.164-.565-.309a.505.505 0 0 1-.138-.373c0-.193.109-.381.267-.484a.49.49 0 0 1 .251-.078.36.36 0 0 1 .163.039c.374.18.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793z"/>
                    </svg>
                    Snapchat
                  </Label>
                  <Input
                    id="snapchat"
                    value={settings.social.snapchat}
                    onChange={(e) => updateSetting("social", "snapchat", e.target.value)}
                    placeholder="https://snapchat.com/add/yourusername"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Default meta tags for the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_title_en">Title (English)</Label>
                  <Input
                    id="seo_title_en"
                    value={settings.seo.title_en}
                    onChange={(e) => updateSetting("seo", "title_en", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_title_ar">Title (Arabic)</Label>
                  <Input
                    id="seo_title_ar"
                    value={settings.seo.title_ar}
                    onChange={(e) => updateSetting("seo", "title_ar", e.target.value)}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seo_description_en">Description (English)</Label>
                  <Textarea
                    id="seo_description_en"
                    value={settings.seo.description_en}
                    onChange={(e) => updateSetting("seo", "description_en", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_description_ar">Description (Arabic)</Label>
                  <Textarea
                    id="seo_description_ar"
                    value={settings.seo.description_ar}
                    onChange={(e) => updateSetting("seo", "description_ar", e.target.value)}
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="og_image">OG Image URL</Label>
                <Input
                  id="og_image"
                  value={settings.seo.og_image}
                  onChange={(e) => updateSetting("seo", "og_image", e.target.value)}
                  placeholder="https://example.com/og-image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
