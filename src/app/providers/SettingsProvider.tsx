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
        console.error("Error fetching system settings:", error);
        return;
      }

      if (data) {
        data.forEach((setting) => {
          if (setting.key === "app_name") setAppName(setting.value || "TSLS Admin OS");
          if (setting.key === "logo_url") setLogoUrl(setting.value || "");
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
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
