import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";

interface SystemSettings {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  loginCoverUrl: string;
  fontFamily: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SystemSettings>({
  appName: "TSLS Admin OS",
  logoUrl: "",
  faviconUrl: "",
  loginCoverUrl: "",
  fontFamily: "Inter",
  isLoading: true,
  refreshSettings: async () => {},
});

export const useSystemSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appName, setAppName] = useState("TSLS Admin OS");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [loginCoverUrl, setLoginCoverUrl] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("system_settings")
        .select("key, value")
        .in("key", ["app_name", "logo_url", "favicon_url", "login_cover_url", "font_family"]);

      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") {
          return;
        }
        console.warn("Settings fetch warning:", error.message);
        return;
      }

      if (data) {
        (data as any[]).forEach((setting) => {
          let val = typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value);
          if (typeof val === "string" && val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
          if (setting.key === "app_name") setAppName(val || "TSLS Admin OS");
          if (setting.key === "logo_url") setLogoUrl(val || "");
          if (setting.key === "favicon_url") setFaviconUrl(val || "");
          if (setting.key === "login_cover_url") setLoginCoverUrl(val || "");
          if (setting.key === "font_family") setFontFamily(val || "Inter");
        });
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const channel = supabaseClient
      .channel("system_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Apply DOM Effects for Favicon and Typography
  useEffect(() => {
    // Favicon
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    // Typography
    if (fontFamily) {
      document.body.style.fontFamily = fontFamily === "System Default" 
        ? "system-ui, -apple-system, sans-serif" 
        : `"${fontFamily}", sans-serif`;
    }
  }, [faviconUrl, fontFamily]);

  return (
    <SettingsContext.Provider value={{ appName, logoUrl, faviconUrl, loginCoverUrl, fontFamily, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
