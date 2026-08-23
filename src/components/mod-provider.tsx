"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseClient } from "@/lib/supabase/client";

export type Mod = {
  id: string;
  name: string;
  description: string;
  kind: "theme" | "comfort";
};

export const MODS: Mod[] = [
  { id: "midnight-violet", name: "Midnight Violet", description: "A violet-tinted dark theme for the entire player.", kind: "theme" },
  { id: "sunset-amber", name: "Sunset Amber", description: "A warm amber theme for controls and highlights.", kind: "theme" },
  { id: "compact-library", name: "Compact Library", description: "Tightens spacing so more tracks fit on screen.", kind: "comfort" },
];

type ModState = {
  installed: string[];
  loading: boolean;
  isInstalled: (id: string) => boolean;
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInstalled([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSupabaseClient().from("user_mods").select("mod_id").eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled) setInstalled((data ?? []).map((row) => row.mod_id));
      })
      .catch(() => !cancelled && setInstalled([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    for (const mod of MODS) root.classList.toggle(`mod-${mod.id}`, installed.includes(mod.id));
  }, [installed]);

  const install = useCallback(async (modId: string) => {
    if (!user || !MODS.some((mod) => mod.id === modId)) return;
    const { error } = await getSupabaseClient().from("user_mods").upsert(
      { user_id: user.id, mod_id: modId, settings: {} },
      { onConflict: "user_id,mod_id" },
    );
    if (error) throw error;
    setInstalled((previous) => previous.includes(modId) ? previous : [...previous, modId]);
  }, [user]);

  const uninstall = useCallback(async (modId: string) => {
    if (!user) return;
    const { error } = await getSupabaseClient().from("user_mods").delete().eq("user_id", user.id).eq("mod_id", modId);
    if (error) throw error;
    setInstalled((previous) => previous.filter((id) => id !== modId));
  }, [user]);

  const value = useMemo(() => ({
    installed, loading, isInstalled: (id: string) => installed.includes(id), install, uninstall,
  }), [installed, loading, install, uninstall]);

  return <ModContext.Provider value={value}>{children}</ModContext.Provider>;
}
