"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePlayer } from "@/components/player-provider";
import { useSettings } from "@/components/settings-provider";
import { fetchAvatarUrl, uploadAvatar } from "@/lib/profile";

const BANDS = [
  { key: "low", label: "Bass", detail: "Low frequencies" },
  { key: "mid", label: "Mid", detail: "Vocals and instruments" },
  { key: "high", label: "Treble", detail: "High frequencies" },
] as const;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme, showAlbumBackdrop, setShowAlbumBackdrop } = useSettings();
  const { equalizer, setEqualizer } = usePlayer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) void fetchAvatarUrl(user.id).then(setAvatar).catch(() => undefined); }, [user]);
  const chooseAvatar = async (file: File | undefined) => {
    if (!user || !file) return;
    setUploading(true); setAvatarError(null);
    try { setAvatar(await uploadAvatar(user.id, file)); } catch (caught) { setAvatarError(caught instanceof Error ? caught.message : "Could not update profile picture."); }
    finally { setUploading(false); }
  };

  return <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10">
    <header><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="text-sm text-neutral-400">Personalize the player, your account, and social preferences.</p></header>
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5"><h2 className="text-lg font-semibold">Account</h2>
      <div className="mt-4 flex items-center gap-4"><button type="button" onClick={() => inputRef.current?.click()} className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-xl font-semibold">{avatar ? <Image src={avatar} alt="Your profile picture" fill unoptimized className="object-cover" /> : (user?.email?.[0] ?? "?").toUpperCase()}</button><div><p className="font-medium">Profile picture</p><p className="text-sm text-neutral-400">Visible beside your identity across Riff.</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-2 text-sm text-emerald-400 hover:underline">{uploading ? "Uploading…" : "Choose image"}</button></div></div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => { void chooseAvatar(event.target.files?.[0]); event.target.value = ""; }} />
      {avatarError ? <p className="mt-3 text-sm text-red-400">{avatarError}</p> : null}
    </section>
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5"><h2 className="text-lg font-semibold">Quick links</h2><div className="mt-4 flex flex-wrap gap-3"><Link href="/friends" className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-emerald-500">Friends & listening privacy</Link><Link href="/mods" className="rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-emerald-500">Mods & layouts</Link></div></section>
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5"><h2 className="text-lg font-semibold">Appearance</h2><div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">Theme</p><p className="text-sm text-neutral-400">Choose the look that feels right.</p></div><div className="flex rounded-full border border-neutral-700 p-1">{(["dark", "light"] as const).map((option) => <button key={option} type="button" onClick={() => setTheme(option)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${theme === option ? "bg-emerald-500 font-semibold text-black" : "text-neutral-400"}`}>{option}</button>)}</div></div><label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-neutral-900 pt-5"><span><span className="block font-medium">Album artwork backdrop</span><span className="block text-sm text-neutral-400">Show the playing track’s cover softly behind your library.</span></span><input type="checkbox" checked={showAlbumBackdrop} onChange={(event) => setShowAlbumBackdrop(event.target.checked)} className="h-5 w-5 accent-emerald-500" /></label></section>
    <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5"><h2 className="text-lg font-semibold">Equalizer</h2><div className="mt-6 grid gap-6 sm:grid-cols-3">{BANDS.map((band) => <label key={band.key} className="flex flex-col gap-2"><span className="flex items-baseline justify-between"><span className="font-medium">{band.label}</span><span className="text-xs tabular-nums text-emerald-400">{equalizer[band.key] > 0 ? "+" : ""}{equalizer[band.key]} dB</span></span><span className="text-xs text-neutral-500">{band.detail}</span><input type="range" min={-12} max={12} step={1} value={equalizer[band.key]} onChange={(event) => setEqualizer(band.key, Number(event.target.value))} className="h-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-emerald-500" /></label>)}</div></section>
  </div>;
}
