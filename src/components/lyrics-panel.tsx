"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useMods } from "@/components/mod-provider";
import { usePlayer } from "@/components/player-provider";
import { fetchLyrics, parseLyrics, saveLyrics } from "@/lib/lyrics";

export function LyricsPanel() {
  const { user } = useAuth();
  const { isInstalled } = useMods();
  const { currentTrack, progress } = usePlayer();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false); setError(null);
    if (!currentTrack) { setContent(""); return; }
    void fetchLyrics(currentTrack.id).then(setContent).catch((caught: Error) => setError(caught.message));
  }, [currentTrack?.id]);

  const lines = useMemo(() => parseLyrics(content), [content]);
  const active = lines.reduce((last, line, index) => line.time !== null && line.time <= progress ? index : last, -1);
  if (!isInstalled("lyrics-lrc") || !currentTrack) return null;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-5 z-30 rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm hover:border-emerald-500">Lyrics</button>
    {open ? <div className="fixed inset-0 z-40 flex justify-end bg-black/60" role="dialog" aria-modal="true">
      <section className="h-full w-full max-w-xl overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{currentTrack.title}</h2><p className="text-sm text-neutral-400">{currentTrack.artist}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-neutral-700 px-3 py-1 text-sm">Close</button></div>
        {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}
        {editing ? <div className="mt-6"><p className="mb-2 text-sm text-neutral-400">Paste lyrics, or upload LRC content. Lines like [01:23.45] are synced to playback.</p><textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-80 w-full rounded-xl border border-neutral-700 bg-black p-3 font-mono text-sm outline-none focus:border-emerald-500" />
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => void saveLyrics(currentTrack.id, user!.id, content).then(() => setEditing(false)).catch((caught: Error) => setError(caught.message))} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black">Save lyrics</button><button type="button" onClick={() => setEditing(false)} className="rounded-full border border-neutral-700 px-4 py-2 text-sm">Cancel</button></div></div> :
          <div className="mt-8 space-y-4 text-lg leading-relaxed">{lines.length ? lines.map((line, index) => <p key={index} className={index === active ? "font-semibold text-emerald-400" : "text-neutral-300"}>{line.text || "♪"}</p>) : <p className="text-sm text-neutral-500">No lyrics have been added for this track yet.</p>}</div>}
        {user?.id === currentTrack.ownerId && !editing ? <button type="button" onClick={() => setEditing(true)} className="mt-8 rounded-full border border-neutral-700 px-4 py-2 text-sm hover:border-emerald-500">{content ? "Edit lyrics" : "Add lyrics"}</button> : null}
      </section></div> : null}
  </>;
}
