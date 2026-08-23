"use client";

import Link from "next/link";
import { MODS, useMods } from "@/components/mod-provider";
import { useAuth } from "@/components/auth-provider";

export default function ModsPage() {
  const { user, loading: authLoading } = useAuth();
  const { loading, isInstalled, install, uninstall } = useMods();

  if (authLoading || loading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;
  if (!user) return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="text-2xl font-semibold">Make Riff yours</h1><p className="text-sm text-neutral-400">Sign in to install personal appearance and comfort mods.</p><Link href="/login" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black">Sign in</Link></div>;

  return <div className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-10"><header><h1 className="text-3xl font-bold tracking-tight">Mod marketplace</h1><p className="mt-1 max-w-2xl text-sm text-neutral-400">Personal, curated changes that apply only to your account. Installed mods are remembered across devices.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{MODS.map((mod) => { const installed = isInstalled(mod.id); return <article key={mod.id} className="flex min-h-48 flex-col rounded-2xl border border-neutral-900 bg-neutral-950 p-5"><span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">{mod.kind}</span><h2 className="mt-3 text-lg font-semibold">{mod.name}</h2><p className="mt-2 flex-1 text-sm text-neutral-400">{mod.description}</p><button type="button" onClick={() => void (installed ? uninstall(mod.id) : install(mod.id))} className={`mt-5 rounded-full px-4 py-2 text-sm font-semibold ${installed ? "border border-neutral-700 text-neutral-300" : "bg-emerald-500 text-black"}`}>{installed ? "Uninstall" : "Install"}</button></article>; })}</div>
    <p className="text-xs text-neutral-500">Mods in this catalog never run downloaded third-party code. New mods can be added as reviewed features without compromising accounts or playback.</p>
  </div>;
}
