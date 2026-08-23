"use client";

import { AuthProvider } from "@/components/auth-provider";
import { PlayerProvider } from "@/components/player-provider";
import { SettingsProvider } from "@/components/settings-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
