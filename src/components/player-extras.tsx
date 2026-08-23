"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useMods } from "@/components/mod-provider";
import { usePlayer } from "@/components/player-provider";

export function PlayerExtras() {
  const { isInstalled } = useMods();
  const { queue, currentTrack, toggleTrack, togglePlay, isPlaying, playNext, playPrevious } = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const openQueue = () => setQueueOpen(true);
    const openFullscreen = () => setFullscreen(true);
    window.addEventListener("riff:open-queue", openQueue);
    window.addEventListener("riff:open-fullscreen", openFullscreen);
    return () => { window.removeEventListener("riff:open-queue", openQueue); window.removeEventListener("riff:open-fullscreen", openFullscreen); };
  }, []);

  return <>
      {queueOpen ? <div className="fixed inset-0 z-40 flex justify-end bg-black/60" role="dialog" aria-modal="true"><section className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Queue</h2><button type="button" onClick={() => setQueueOpen(false)} className="rounded-full border border-neutral-700 px-3 py-1 text-sm">Close</button></div><p className="mt-2 text-sm text-neutral-400">{queue.length} track{queue.length === 1 ? "" : "s"}</p><ol className="mt-5 space-y-1">{queue.map((track, index) => <li key={`${track.id}-${index}`}><button type="button" onClick={() => toggleTrack(queue, index)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-neutral-900 ${currentTrack?.id === track.id ? "text-[var(--accent)]" : ""}`}><span className="w-6 text-right text-sm text-neutral-500">{index + 1}</span><span className="min-w-0"><span className="block truncate font-medium">{track.title}</span><span className="block truncate text-sm text-neutral-400">{track.artist}</span></span></button></li>)}</ol></section></div> : null}
    {fullscreen ? <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-black to-neutral-950 px-6 text-center"><button type="button" onClick={() => setFullscreen(false)} className="absolute right-6 top-6 rounded-full border border-neutral-700 px-4 py-2 text-sm">Exit fullscreen</button><div className="relative h-64 w-64 overflow-hidden rounded-2xl bg-neutral-800 shadow-2xl sm:h-96 sm:w-96">{currentTrack?.coverUrl ? <Image src={currentTrack.coverUrl} alt="" fill unoptimized className="object-cover" /> : null}</div><h2 className="mt-8 text-3xl font-bold">{currentTrack?.title ?? "Nothing playing"}</h2><p className="mt-2 text-neutral-400">{currentTrack?.artist ?? "Choose a track to begin"}</p><div className="mt-8 flex items-center gap-6"><button type="button" onClick={playPrevious} className="rounded-full border border-neutral-700 px-4 py-2">Previous</button><button type="button" onClick={togglePlay} className="rounded-full bg-white px-6 py-3 font-semibold text-black">{isPlaying ? "Pause" : "Play"}</button><button type="button" onClick={playNext} className="rounded-full border border-neutral-700 px-4 py-2">Next</button></div></div> : null}
  </>;
}
