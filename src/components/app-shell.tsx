"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PlayerBar } from "@/components/player-bar";
import { MusicIcon } from "@/components/icons";
import { usePlayer } from "@/components/player-provider";
import { useSettings } from "@/components/settings-provider";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Your library" },
  { href: "/search", label: "Search" },
  { href: "/browse", label: "Browse" },
  { href: "/friends", label: "Friends" },
  { href: "/mods", label: "Mods" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, displayName, loading, signOut } = useAuth();
  const { currentTrack } = usePlayer();
  const { showAlbumBackdrop } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col justify-center gap-4 px-6 text-neutral-200">
        <h1 className="text-2xl font-semibold">Almost there</h1>
        <p className="text-sm text-neutral-400">
          Set <code className="text-emerald-400">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-emerald-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code>.env.local</code> (see <code>.env.example</code>), run <code>supabase/schema.sql</code>{" "}
          in the Supabase SQL editor, then restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden text-neutral-100">
      {showAlbumBackdrop && currentTrack?.coverUrl ? (
        <>
          <div className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-3xl transition-opacity duration-700" style={{ backgroundImage: `url("${currentTrack.coverUrl}")` }} />
          <div className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
        </>
      ) : null}
      <header className="relative sticky top-0 z-20 flex flex-wrap items-center gap-6 border-b border-neutral-900 bg-black/80 px-6 py-3 backdrop-blur transition-colors duration-300">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MusicIcon className="h-5 w-5 text-emerald-400" /> Riff
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "text-white" : "text-neutral-400 transition hover:text-white"}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <span className="text-neutral-400">{displayName}</span>
              <button type="button" onClick={async () => { await signOut(); router.push("/"); }} className="rounded-full border border-neutral-700 px-4 py-1.5 transition hover:border-neutral-500">Log out</button>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-black transition hover:bg-emerald-400">Sign in</Link>
          )}
        </div>
      </header>
      <main className="relative z-10 flex flex-1 flex-col pb-32">{children}</main>
      <PlayerBar />
    </div>
  );
}
