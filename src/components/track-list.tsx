"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePlayer } from "@/components/player-provider";
import { MusicIcon, PauseIcon, PlayIcon, TrashIcon } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { Playlist, Track } from "@/lib/library";

type TrackListProps = {
  tracks: Track[]; showOwner?: boolean; onRemove?: (track: Track) => void; removeLabel?: string;
  renderActions?: (track: Track) => React.ReactNode; playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, tracks: Track[]) => Promise<void> | void;
};

export function TrackList({ tracks, showOwner = false, onRemove, removeLabel = "Delete", renderActions, playlists = [], onAddToPlaylist }: TrackListProps) {
  const { currentTrack, isPlaying, toggleTrack, enqueueTrack } = usePlayer();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ track: Track; index: number; x: number; y: number } | null>(null);
  const canAdd = Boolean(onAddToPlaylist && playlists.length > 0);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close); window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, []);

  const addTracks = async (playlistId: string, selectedTracks: Track[]) => {
    await onAddToPlaylist?.(playlistId, selectedTracks); setSelected(new Set()); setMenu(null);
  };
  const menuItem = (label: string, action: () => void, destructive = false) => <button type="button" role="menuitem" onClick={() => { action(); setMenu(null); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-800 ${destructive ? "text-red-400" : ""}`}>{label}</button>;

  return <>
    {canAdd && selected.size > 0 ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-700/50 bg-emerald-500/10 px-4 py-3"><p className="text-sm font-medium">{selected.size} {selected.size === 1 ? "track" : "tracks"} selected</p><div className="flex items-center gap-2"><select defaultValue="" onChange={(event) => { const playlistId = event.target.value; event.target.value = ""; if (playlistId) void addTracks(playlistId, tracks.filter((track) => selected.has(track.id))); }} className="rounded-full border border-emerald-600 bg-neutral-950 px-3 py-1.5 text-sm outline-none"><option value="">Add selected to playlist…</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select><button type="button" onClick={() => setSelected(new Set())} className="text-sm text-neutral-400 hover:text-white">Clear</button></div></div> : null}
    <ul className="flex flex-col divide-y divide-neutral-900 overflow-hidden rounded-2xl border border-neutral-900">
      {tracks.map((track, index) => {
        const active = currentTrack?.id === track.id;
        return <li key={track.id} onContextMenu={(event) => { event.preventDefault(); setMenu({ track, index, x: event.clientX, y: event.clientY }); }} className={`group flex items-center gap-4 px-4 py-3 transition hover:bg-neutral-900 ${active ? "bg-neutral-900" : ""}`}>
          {canAdd ? <input type="checkbox" checked={selected.has(track.id)} onChange={(event) => setSelected((previous) => { const next = new Set(previous); event.target.checked ? next.add(track.id) : next.delete(track.id); return next; })} aria-label={`Select ${track.title}`} className="h-4 w-4 shrink-0 accent-emerald-500" /> : null}
          <button type="button" onClick={() => toggleTrack(tracks, index)} aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`} className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-neutral-800">{track.coverUrl ? <Image src={track.coverUrl} alt="" fill unoptimized className="object-cover" /> : <MusicIcon className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />}<span data-active={active} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 data-[active=true]:opacity-100">{active && isPlaying ? <PauseIcon className="h-4 w-4 text-white" /> : <PlayIcon className="h-4 w-4 text-white" />}</span></button>
          <span className="w-6 text-right text-sm tabular-nums text-neutral-500">{index + 1}</span><div className="min-w-0 flex-1"><p className={`truncate font-medium ${active ? "text-emerald-400" : ""}`}>{track.title}</p><p className="truncate text-sm text-neutral-400">{track.artist}{track.album ? ` · ${track.album}` : ""}{showOwner ? ` · added by ${track.ownerName}` : ""}</p></div>
          {renderActions ? renderActions(track) : null}<span className="w-12 text-right text-sm tabular-nums text-neutral-400">{formatTime(track.duration)}</span>
          {onRemove ? <button type="button" onClick={() => onRemove(track)} aria-label={`${removeLabel} ${track.title}`} className="rounded p-2 text-neutral-500 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"><TrashIcon className="h-4 w-4" /></button> : null}
        </li>;
      })}
    </ul>
    {menu ? <div role="menu" onClick={(event) => event.stopPropagation()} className="fixed z-50 min-w-60 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 p-1 shadow-2xl" style={{ left: Math.min(menu.x, window.innerWidth - 260), top: Math.min(menu.y, window.innerHeight - 310) }}>
      <p className="truncate px-3 py-2 text-xs text-neutral-400">{menu.track.title} · {menu.track.artist}</p>
      <div className="border-t border-neutral-800 py-1">{menuItem("Play", () => toggleTrack(tracks, menu.index))}{menuItem("Add to queue", () => enqueueTrack(menu.track))}{menuItem("Play next", () => enqueueTrack(menu.track, true))}</div>
      {canAdd ? <><p className="border-t border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Add to playlist</p>{playlists.map((playlist) => <button key={playlist.id} type="button" role="menuitem" onClick={() => void addTracks(playlist.id, [menu.track])} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-800">{playlist.name}</button>)}</> : null}
      {onRemove ? <div className="border-t border-neutral-800 py-1">{menuItem(removeLabel, () => onRemove(menu.track), true)}</div> : null}
    </div> : null}
  </>;
}
