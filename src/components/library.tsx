"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { usePlayer } from "@/components/player-provider";
import { MusicIcon, PauseIcon, PlayIcon, TrashIcon } from "@/components/icons";
import { formatBytes, formatTime } from "@/lib/format";

export function Library() {
  const {
    tracks,
    coverUrls,
    loading,
    importing,
    currentTrack,
    isPlaying,
    addFiles,
    playTrack,
    removeTrack,
  } = usePlayer();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) =>
      [track.title, track.artist, track.album, track.fileName]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, tracks]);

  return (
    <div
      className="flex flex-1 flex-col gap-6 px-6 pb-40 pt-8 sm:px-10"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void addFiles(event.dataTransfer.files);
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
          <p className="text-sm text-neutral-400">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"} stored in this browser
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, artist, album"
            className="w-56 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Add music
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.flac,.ogg,.wav"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {importing ? (
        <p className="text-sm text-emerald-400">
          Importing {importing.done} / {importing.total}…
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading library…</p>
      ) : filtered.length === 0 ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition ${
            dragging ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-800"
          }`}
        >
          <MusicIcon className="h-10 w-10 text-neutral-600" />
          <p className="text-lg font-medium">
            {tracks.length === 0 ? "No music yet" : "No matches"}
          </p>
          <p className="max-w-sm text-sm text-neutral-400">
            {tracks.length === 0
              ? "Drop mp3 files anywhere on this page, or use “Add music”. Files stay on your device."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-900 overflow-hidden rounded-2xl border border-neutral-900">
          {filtered.map((track, index) => {
            const active = currentTrack?.id === track.id;
            const cover = coverUrls[track.id];
            return (
              <li
                key={track.id}
                className={`group flex items-center gap-4 px-4 py-3 transition hover:bg-neutral-900 ${
                  active ? "bg-neutral-900" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track.id)}
                  aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-neutral-800"
                >
                  {cover ? (
                    <Image src={cover} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <MusicIcon className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 data-[active=true]:opacity-100" data-active={active}>
                    {active && isPlaying ? (
                      <PauseIcon className="h-4 w-4 text-white" />
                    ) : (
                      <PlayIcon className="h-4 w-4 text-white" />
                    )}
                  </span>
                </button>
                <span className="w-6 text-right text-sm tabular-nums text-neutral-500">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${active ? "text-emerald-400" : ""}`}>
                    {track.title}
                  </p>
                  <p className="truncate text-sm text-neutral-400">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                </div>
                <span className="hidden text-sm text-neutral-500 sm:block">
                  {formatBytes(track.size)}
                </span>
                <span className="w-12 text-right text-sm tabular-nums text-neutral-400">
                  {formatTime(track.duration)}
                </span>
                <button
                  type="button"
                  onClick={() => void removeTrack(track.id)}
                  aria-label={`Remove ${track.title}`}
                  className="rounded p-2 text-neutral-500 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {dragging && filtered.length > 0 ? (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-black/70 text-lg font-semibold text-emerald-400">
          Drop files to add them to your library
        </div>
      ) : null}
    </div>
  );
}
