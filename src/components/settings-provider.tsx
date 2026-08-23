"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

type SettingsState = {
  theme: Theme;
  showAlbumBackdrop: boolean;
  setTheme: (theme: Theme) => void;
  setShowAlbumBackdrop: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsState | null>(null);
const STORAGE_KEY = "riff-settings";

export function useSettings(): SettingsState {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [showAlbumBackdrop, setShowAlbumBackdropState] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<{
        theme: Theme;
        showAlbumBackdrop: boolean;
      }>;
      if (saved.theme === "light" || saved.theme === "dark") setThemeState(saved.theme);
      if (typeof saved.showAlbumBackdrop === "boolean") setShowAlbumBackdropState(saved.showAlbumBackdrop);
    } catch {
      // Use the default appearance if saved settings cannot be read.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, showAlbumBackdrop }));
  }, [showAlbumBackdrop, theme]);

  const value = useMemo(
    () => ({
      theme,
      showAlbumBackdrop,
      setTheme: setThemeState,
      setShowAlbumBackdrop: setShowAlbumBackdropState,
    }),
    [showAlbumBackdrop, theme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
