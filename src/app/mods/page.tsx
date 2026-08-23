"use client";

import Link from "next/link";
import { MODS, useMods, type LayoutStyle } from "@/components/mod-provider";
import { useAuth } from "@/components/auth-provider";

export default function ModsPage() {
  const { user, loading: authLoading } = useAuth();
  const { loading, isInstalled, install, uninstall, layout, setLayout, accentColor, setAccentColor } = useMods();
  if (authLoading || loading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;
  if (!user) return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="text-2xl font-semibold">Make Riff yours</h1><p className="text-sm text-neutral-400">Sign in to install personal appearance and comfort mods.</p><Link href="/login" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black">Sign in</Link></div>;
  const setActiveLayout = (next: LayoutStyle) => void setLayout(next);

  return <div className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-10"><header><h1 className="text-3xl font-bold tracking-tight">Mod marketplace</h1><p className="mt-1 max-w-2xl text-sm text-neutral-400">Personal, curated changes that apply only to your account. Downloads and preferences follow you across devices.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MODS.map((mod) => { const installed = isInstalled(mod.id); return <article key={mod.id} className="flex min-h-48 flex-col rounded-2xl border border-neutral-900 bg-neutral-950 p-5"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{mod.kind}</span><h2 className="mt-3 text-lg font-semibold">{mod.name}</h2><p className="mt-2 flex-1 text-sm text-neutral-400">{mod.description}</p><button type="button" onClick={() => void (installed ? uninstall(mod.id) : install(mod.id))} className={`mt-5 rounded-full px-4 py-2 text-sm font-semibold ${installed ? "border border-neutral-700 text-neutral-300" : "bg-emerald-500 text-black"}`}>{installed ? "Uninstall" : "Install"}</button></article>; })}</div>
    {(isInstalled("apple-music-ui") || isInstalled("spotify-ui")) ? <section className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5"><h2 className="text-lg font-semibold">Active layout</h2><p className="mt-1 text-sm text-neutral-400">Keep both skins installed and switch between them whenever you like.</p><div className="mt-4 flex flex-wrap gap-2">{(["default", "apple", "spotify"] as LayoutStyle[]).map((option) => <button key={option} type="button" disabled={option === "apple" && !isInstalled("apple-music-ui") || option === "spotify" && !isInstalled("spotify-ui")} onClick={() => setActiveLayout(option)} className={`rounded-full border px-4 py-2 text-sm capitalize disabled:cursor-not-allowed disabled:opacity-40 ${layout === option ? "border-[var(--accent)] text-[var(--accent)]" : "border-neutral-700"}`}>{option === "apple" ? "Apple Music" : option}</button>)}</div></section> : null}
    {isInstalled("custom-colors") ? <section className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5"><h2 className="text-lg font-semibold">Accent color</h2><p className="mt-1 text-sm text-neutral-400">Used by every layout, including Apple Music and Spotify skins.</p><label className="mt-4 flex items-center gap-3"><input type="color" value={accentColor} onChange={(event) => void setAccentColor(event.target.value)} className="h-10 w-14 cursor-pointer rounded border border-neutral-700 bg-transparent p-1" /><code className="text-sm text-neutral-300">{accentColor}</code></label></section> : null}
    <p className="text-xs text-neutral-500">Mods never run downloaded third-party code. The Apple and Spotify styles share the same player, queue, lyrics, colors, and fullscreen features.</p>
  </div>;
}
