"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon, ShuffleIcon } from "@/components/icons";
import { useMods } from "@/components/mod-provider";
import { usePlayer } from "@/components/player-provider";
import { fetchLyrics, lookupLyrics, parseLyrics } from "@/lib/lyrics";

export function PlayerExtras() {
  const { isInstalled } = useMods();
  const { queue, currentTrack, toggleTrack, togglePlay, isPlaying, playNext, playPrevious, progress, shuffle, toggleShuffle } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const lyricsEnabled = isInstalled("lyrics-lrc");

  useEffect(() => {
    const openQueue = () => setQueueOpen(true);
    const openFullscreen = () => setFullscreen(true);
    window.addEventListener("riff:open-queue", openQueue);
    window.addEventListener("riff:open-fullscreen", openFullscreen);
    return () => {
      window.removeEventListener("riff:open-queue", openQueue);
      window.removeEventListener("riff:open-fullscreen", openFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen || !lyricsEnabled || !currentTrack) {
      setLyrics("");
      setLyricsError(null);
      return;
    }
    let cancelled = false;
    setLyricsError(null);
    void (async () => {
      try {
        const saved = await fetchLyrics(currentTrack.id);
        if (cancelled) return;
        if (saved) {
          setLyrics(saved);
          return;
        }
        const found = await lookupLyrics(currentTrack.title, currentTrack.artist, currentTrack.album, currentTrack.duration);
        if (!cancelled && found) setLyrics(found.content);
      } catch {
        if (!cancelled) setLyricsError("Lyrics lookup is unavailable right now.");
      }
    })();
    return () => { cancelled = true; };
  }, [currentTrack?.id, fullscreen, lyricsEnabled]);

  const lyricLines = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const activeLine = lyricLines.reduce((last, line, index) => line.time !== null && line.time <= progress ? index : last, -1);

  const findLyrics = async () => {
    if (!currentTrack) return;
    setLookingUp(true);
    setLyricsError(null);
    try {
      const found = await lookupLyrics(currentTrack.title, currentTrack.artist, currentTrack.album, currentTrack.duration);
      if (!found) {
        setLyricsError("No lyrics found for this track.");
        return;
      }
      setLyrics(found.content);
    } catch {
      setLyricsError("Lyrics lookup is unavailable right now.");
    } finally {
      setLookingUp(false);
    }
  };

  return <>
    {queueOpen ? <div className="fixed inset-0 z-40 flex justify-end bg-black/60" role="dialog" aria-modal="true"><section className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Queue</h2><button type="button" onClick={() => setQueueOpen(false)} className="rounded-full border border-neutral-700 px-3 py-1 text-sm">Close</button></div><p className="mt-2 text-sm text-neutral-400">{queue.length} track{queue.length === 1 ? "" : "s"}</p><ol className="mt-5 space-y-1">{queue.map((track, index) => <li key={`${track.id}-${index}`}><button type="button" onClick={() => toggleTrack(queue, index)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-neutral-900 ${currentTrack?.id === track.id ? "text-[var(--accent)]" : ""}`}><span className="w-6 text-right text-sm text-neutral-500">{index + 1}</span><span className="min-w-0"><span className="block truncate font-medium">{track.title}</span><span className="block truncate text-sm text-neutral-400">{track.artist}</span></span></button></li>)}</ol></section></div> : null}
    {fullscreen ? <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-neutral-900 via-black to-neutral-950 px-6 py-16 text-neutral-100"><button type="button" onClick={() => setFullscreen(false)} className="absolute right-6 top-6 rounded-full border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-400">Exit fullscreen</button>
      <div className="mx-auto grid min-h-full w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,.8fr)]">
        <section className="flex min-w-0 flex-col items-start justify-center lg:pl-8">
          <div className="relative aspect-square w-full max-w-[min(34rem,72vw)] overflow-hidden rounded-2xl bg-neutral-800 shadow-2xl">{currentTrack?.coverUrl ? <Image src={currentTrack.coverUrl} alt="" fill unoptimized className="object-cover" /> : null}</div>
          <h2 className="mt-7 max-w-xl text-3xl font-bold sm:text-4xl">{currentTrack?.title ?? "Nothing playing"}</h2>
          <p className="mt-2 text-lg text-neutral-400">{currentTrack?.artist ?? "Choose a track to begin"}</p>
          <div className="mt-8 flex items-center gap-5">
            <button type="button" onClick={toggleShuffle} aria-label="Toggle shuffle" aria-pressed={shuffle} className={`rounded-full p-3 transition hover:bg-white/10 ${shuffle ? "text-[var(--accent)]" : "text-neutral-300"}`}><ShuffleIcon className="h-5 w-5" /></button>
            <button type="button" onClick={playPrevious} aria-label="Previous track" className="rounded-full p-3 text-neutral-200 transition hover:bg-white/10"><PreviousIcon className="h-6 w-6" /></button>
            <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black transition hover:scale-105">{isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}</button>
            <button type="button" onClick={playNext} aria-label="Next track" className="rounded-full p-3 text-neutral-200 transition hover:bg-white/10"><NextIcon className="h-6 w-6" /></button>
          </div>
        </section>
        <aside className="flex min-h-96 flex-col rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-neutral-500">Lyrics</p><h3 className="mt-1 text-xl font-semibold">{lyricsEnabled ? "Now playing" : "Lyrics mod required"}</h3></div>{lyricsEnabled ? <button type="button" disabled={lookingUp || !currentTrack} onClick={() => void findLyrics()} className="shrink-0 rounded-full border border-neutral-600 px-3 py-1.5 text-sm transition hover:border-white disabled:opacity-40">{lookingUp ? "Finding…" : "Find lyrics"}</button> : null}</div>
          {lyricsEnabled ? <div className="mt-7 flex-1 space-y-4 overflow-y-auto pr-2 text-lg leading-relaxed">{lyricsError ? <p className="text-sm text-red-400">{lyricsError}</p> : null}{lyricLines.length ? lyricLines.map((line, index) => <p key={index} className={index === activeLine ? "font-semibold text-[var(--accent)]" : "text-neutral-300"}>{line.text || "♪"}</p>) : <p className="text-sm text-neutral-500">No lyrics loaded yet. Use “Find lyrics” to search the free providers.</p>}</div> : <p className="mt-7 text-sm leading-6 text-neutral-400">Install the Lyrics mod to show synced lyrics here while you listen.</p>}
        </aside>
      </div>
    </div> : null}
  </>;
}
