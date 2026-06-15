import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseClient } from "../../lib/supabase/client";

interface SystemSettings {
  appName: string;
  logoUrl: string;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SystemSettings>({
  appName: "TSLS Admin OS",
  logoUrl: "",
  isLoading: true,
  refreshSettings: async () => {},
});

export const useSystemSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appName, setAppName] = useState("TSLS Admin OS");
  const [logoUrl, setLogoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("system_settings")
        .select("key, value")
        .in("key", ["app_name", "logo_url"]);

      if (error) {
        // Jika tabel belum ada (PGRST205), gunakan default tanpa spam console
        if (error.code === "PGRST205" || error.code === "42P01") {
          // Tabel belum dibuat, gunakan nilai default saja
          return;
        }
        console.warn("Settings fetch warning:", error.message);
        return;
      }

      if (data) {
        (data as any[]).forEach((setting) => {
          // JSONB values dari Supabase sudah otomatis di-parse
          const val = typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value);
          if (setting.key === "app_name") setAppName(val || "TSLS Admin OS");
          if (setting.key === "logo_url") setLogoUrl(val || "");
        });
      }
    } catch (err) {
      // Gagal total, gunakan default
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes in settings
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
          // Refresh when a setting changes
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ appName, logoUrl, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
