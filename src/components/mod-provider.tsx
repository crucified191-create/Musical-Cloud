"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";

export type LayoutStyle = "default" | "apple" | "spotify";
export type Mod = { id: string; name: string; description: string; kind: "theme" | "layout" | "comfort" };

export const MODS: Mod[] = [
  { id: "apple-music-ui", name: "Apple Music layout", description: "A polished light-and-glass inspired layout with a left sidebar.", kind: "layout" },
  { id: "spotify-ui", name: "Spotify layout", description: "A focused dark layout with the familiar music-player sidebar.", kind: "layout" },
  { id: "custom-colors", name: "Custom colors", description: "Choose a personal accent color for controls and highlights.", kind: "theme" },
  { id: "midnight-violet", name: "Midnight Violet", description: "A violet-tinted dark theme for the entire player.", kind: "theme" },
  { id: "sunset-amber", name: "Sunset Amber", description: "A warm amber theme for controls and highlights.", kind: "theme" },
  { id: "compact-library", name: "Compact Library", description: "Tightens spacing so more tracks fit on screen.", kind: "comfort" },
  { id: "queue-view", name: "Queue", description: "Open and play anything in your current queue.", kind: "comfort" },
  { id: "fullscreen-player", name: "Fullscreen player", description: "A distraction-free, album-art focused playback screen.", kind: "comfort" },
  { id: "lyrics-lrc", name: "Lyrics", description: "View your own LRC lyrics or look up a timed version from LRCLIB.", kind: "comfort" },
];

type ModState = {
  installed: string[]; loading: boolean; layout: LayoutStyle; accentColor: string;
  isInstalled: (id: string) => boolean; install: (id: string) => Promise<void>; uninstall: (id: string) => Promise<void>;
  setLayout: (layout: LayoutStyle) => Promise<void>; setAccentColor: (color: string) => Promise<void>;
};
const ModContext = createContext<ModState | null>(null);
export function useMods(): ModState {
  const context = useContext(ModContext);
  if (!context) throw new Error("useMods must be used inside ModProvider");
  return context;
}

export function ModProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [installed, setInstalled] = useState<string[]>([]);
  const [layout, setLayoutState] = useState<LayoutStyle>("default");
  const [accentColor, setAccentColorState] = useState("#22c55e");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setInstalled([]); setLayoutState("default"); setLoading(false); return; }
    let cancelled = false; setLoading(true);
    void (async () => {
      try {
        const { data, error } = await getSupabaseClient().from("user_mods").select("mod_id, settings").eq("user_id", user.id);
        if (error) throw error;
        if (cancelled) return;
        const rows = data ?? [];
        setInstalled(rows.map((row) => row.mod_id));
        const layoutRow = rows.find((row) => row.mod_id === "layout-preference");
        const colorRow = rows.find((row) => row.mod_id === "custom-colors");
        const savedLayout = layoutRow?.settings?.layout;
        const savedColor = colorRow?.settings?.accent;
        if (savedLayout === "apple" || savedLayout === "spotify" || savedLayout === "default") setLayoutState(savedLayout);
        if (typeof savedColor === "string" && /^#[0-9a-f]{6}$/i.test(savedColor)) setAccentColorState(savedColor);
      } catch { if (!cancelled) setInstalled([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    for (const mod of MODS) root.classList.toggle(`mod-${mod.id}`, installed.includes(mod.id));
    root.dataset.layout = layout;
    root.style.setProperty("--accent", accentColor);
  }, [installed, layout, accentColor]);

  const install = useCallback(async (modId: string) => {
    if (!user || !MODS.some((mod) => mod.id === modId)) return;
    const { error } = await getSupabaseClient().from("user_mods").upsert({ user_id: user.id, mod_id: modId, settings: {} });
    if (error) throw error;
    setInstalled((previous) => previous.includes(modId) ? previous : [...previous, modId]);
  }, [user]);

  const uninstall = useCallback(async (modId: string) => {
    if (!user) return;
    const { error } = await getSupabaseClient().from("user_mods").delete().eq("user_id", user.id).eq("mod_id", modId);
    if (error) throw error;
    setInstalled((previous) => previous.filter((id) => id !== modId));
    if (modId === "apple-music-ui" && layout === "apple") setLayoutState("default");
    if (modId === "spotify-ui" && layout === "spotify") setLayoutState("default");
  }, [layout, user]);

  const setLayout = useCallback(async (next: LayoutStyle) => {
    if (!user || (next !== "default" && !installed.includes(next === "apple" ? "apple-music-ui" : "spotify-ui"))) return;
    const { error } = await getSupabaseClient().from("user_mods").upsert({ user_id: user.id, mod_id: "layout-preference", settings: { layout: next } });
    if (error) throw error;
    setLayoutState(next);
  }, [installed, user]);

  const setAccentColor = useCallback(async (color: string) => {
    if (!user || !installed.includes("custom-colors")) return;
    const { error } = await getSupabaseClient().from("user_mods").upsert({ user_id: user.id, mod_id: "custom-colors", settings: { accent: color } });
    if (error) throw error;
    setAccentColorState(color);
  }, [installed, user]);

  const value = useMemo(() => ({ installed, loading, layout, accentColor, isInstalled: (id: string) => installed.includes(id), install, uninstall, setLayout, setAccentColor }), [installed, loading, layout, accentColor, install, uninstall, setLayout, setAccentColor]);
  return <ModContext.Provider value={value}>{children}</ModContext.Provider>;
}
