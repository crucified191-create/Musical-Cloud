"use client";

import { usePlayer } from "@/components/player-provider";
import { useSettings } from "@/components/settings-provider";

const BANDS = [
  { key: "low", label: "Bass", detail: "Low frequencies" },
  { key: "mid", label: "Mid", detail: "Vocals and instruments" },
  { key: "high", label: "Treble", detail: "High frequencies" },
] as const;

export default function SettingsPage() {
  const { theme, setTheme, showAlbumBackdrop, setShowAlbumBackdrop } = useSettings();
  const { equalizer, setEqualizer } = usePlayer();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-400">Personalize the player and how your music sounds.</p>
      </header>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-neutral-400">Choose the look that feels right.</p>
          </div>
          <div className="flex rounded-full border border-neutral-700 p-1">
            {(["dark", "light"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
                  theme === option ? "bg-emerald-500 font-semibold text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-neutral-900 pt-5">
          <span>
            <span className="block font-medium">Album artwork backdrop</span>
            <span className="block text-sm text-neutral-400">
              Show the playing track’s cover softly behind your library.
            </span>
          </span>
          <input
            type="checkbox"
            checked={showAlbumBackdrop}
            onChange={(event) => setShowAlbumBackdrop(event.target.checked)}
            className="h-5 w-5 accent-emerald-500"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5">
        <h2 className="text-lg font-semibold">Equalizer</h2>
        <p className="mt-1 text-sm text-neutral-400">Fine-tune playback, like Spotify’s simple equalizer.</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {BANDS.map((band) => (
            <label key={band.key} className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between">
                <span className="font-medium">{band.label}</span>
                <span className="text-xs tabular-nums text-emerald-400">
                  {equalizer[band.key] > 0 ? "+" : ""}{equalizer[band.key]} dB
                </span>
              </span>
              <span className="text-xs text-neutral-500">{band.detail}</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={equalizer[band.key]}
                onChange={(event) => setEqualizer(band.key, Number(event.target.value))}
                className="h-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-emerald-500"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
