import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type Theme = "dark" | "light" | "system";
type ColorTheme = "emerald" | "ocean" | "rose" | "slate" | "islamic";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
  colorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  colorTheme: "emerald",
  setColorTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultColorTheme = "emerald",
  storageKey = "vite-ui-theme",
  colorStorageKey = "vite-ui-color-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(colorStorageKey) as ColorTheme) || defaultColorTheme
  );

  const location = useLocation();

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply dark/light theme
    root.classList.remove("light", "dark");
    
    // Force light mode on all portal pages for better UX
    const isPortalRoute = 
      location.pathname.includes('/portal') || 
      location.pathname.includes('/ekskul-portal') ||
      location.pathname.includes('/spmb') ||
      location.pathname.includes('/cbt') ||
      location.pathname.includes('/teacher') ||
      location.pathname.includes('/bendahara');
    
    if (isPortalRoute) {
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.style.colorScheme = ""; // Reset
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    }

    // Apply color theme
    root.classList.remove("theme-emerald", "theme-ocean", "theme-rose", "theme-slate", "theme-islamic");
    if (colorTheme !== "emerald") {
      root.classList.add(`theme-${colorTheme}`);
    }

  }, [theme, colorTheme, location.pathname]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    colorTheme,
    setColorTheme: (color: ColorTheme) => {
      localStorage.setItem(colorStorageKey, color);
      setColorTheme(color);
    }
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
