import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
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
                Connect your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input
                  id="instagram"
                  value={settings.social.instagram}
                  onChange={(e) => updateSetting("social", "instagram", e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={settings.social.linkedin}
                  onChange={(e) => updateSetting("social", "linkedin", e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube URL</Label>
                <Input
                  id="youtube"
                  value={settings.social.youtube}
                  onChange={(e) => updateSetting("social", "youtube", e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                />
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
