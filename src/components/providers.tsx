"use client";

import { AuthProvider } from "@/components/auth-provider";
import { PlayerProvider } from "@/components/player-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </AuthProvider>
  );
}
