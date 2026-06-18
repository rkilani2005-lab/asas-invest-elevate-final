import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteContact {
  phone?: string;
  email?: string;
  address_en?: string;
  address_ar?: string;
  whatsapp?: string;
}

export interface SiteSocial {
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  snapchat?: string;
  telegram?: string;
  whatsapp_channel?: string;
}

export interface SiteSettingsData {
  contact: SiteContact;
  social: SiteSocial;
}

const defaults: SiteSettingsData = { contact: {}, social: {} };

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsData>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      if (!mounted) return;
      const next: SiteSettingsData = { contact: {}, social: {} };
      data?.forEach((row: any) => {
        if (row.key === "contact") next.contact = row.value || {};
        if (row.key === "social") next.social = row.value || {};
      });
      setSettings(next);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { settings, loading };
}
