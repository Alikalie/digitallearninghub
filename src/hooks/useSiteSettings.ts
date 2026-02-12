import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_address: string;
  footer_text: string;
  demo_video_url: string;
  anthem_video_url: string;
  site_name: string;
  site_tagline: string;
}

const DEFAULTS: SiteSettings = {
  contact_email: "info@dlhub.com",
  contact_phone: "+232 XX XXX XXXX",
  contact_whatsapp: "+232 XX XXX XXXX",
  contact_address: "Freetown, Sierra Leone",
  footer_text: "© Digital Learning Hub. Made by Alikalie. All rights reserved.",
  demo_video_url: "",
  anthem_video_url: "",
  site_name: "Digital Learning Hub",
  site_tagline: "AI-Powered Education Platform",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("admin_settings").select("key, value");
      if (data) {
        const mapped = { ...DEFAULTS };
        data.forEach((row) => {
          const key = row.key as keyof SiteSettings;
          if (key in mapped && row.value !== null) {
            mapped[key] = typeof row.value === "string" ? row.value : String(row.value);
          }
        });
        setSettings(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  return { settings, loading };
}
