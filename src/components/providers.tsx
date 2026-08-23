"use client";

import { AuthProvider } from "@/components/auth-provider";
import { ModProvider } from "@/components/mod-provider";
import { PlayerProvider } from "@/components/player-provider";
import { SettingsProvider } from "@/components/settings-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ModProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </ModProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
