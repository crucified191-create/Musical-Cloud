"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { TrackList } from "@/components/track-list";
import { MusicIcon } from "@/components/icons";
import {
  addTrackToPlaylist,
  createPlaylist,
  deleteTrack,
  fetchPlaylists,
  fetchTracks,
  isAudioFile,
  setPlaylistVisibility,
  uploadTrack,
  type Playlist,
  type Track,
} from "@/lib/library";

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [newPlaylist, setNewPlaylist] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchTracks(user.id), fetchPlaylists(user.id)])
      .then(([ownTracks, ownPlaylists]) => {
        if (cancelled) return;
        setTracks(ownTracks);
        setPlaylists(ownPlaylists);
      })
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) =>
      [track.title, track.artist, track.album].join(" ").toLowerCase().includes(needle),
    );
  }, [query, tracks]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!user) return;
      const audioFiles = Array.from(files).filter(isAudioFile);
      if (audioFiles.length === 0) return;
      setError(null);
      setUploading({ done: 0, total: audioFiles.length });
      const uploaded: Track[] = [];
      for (const [index, file] of audioFiles.entries()) {
        try {
          uploaded.push(await uploadTrack(file, user.id));
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : `Failed to upload ${file.name}`);
        }
        setUploading({ done: index + 1, total: audioFiles.length });
      }
      setTracks((previous) => [...uploaded.reverse(), ...previous]);
      setUploading(null);
    },
    [user],
  );

  if (authLoading) {
    return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <MusicIcon className="h-10 w-10 text-neutral-700" />
        <h1 className="text-2xl font-semibold">Your music, everywhere</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          Sign in to upload mp3s and build playlists, or browse what everyone else is sharing.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Sign in
          </Link>
          <Link
            href="/browse"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm transition hover:border-neutral-500"
          >
            Browse playlists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-8 px-6 py-8 sm:px-10"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
          <p className="text-sm text-neutral-400">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-48 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500"
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
              if (event.target.files) void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {uploading ? (
        <p className="text-sm text-emerald-400">
          Uploading {uploading.done} / {uploading.total}…
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Playlists</h2>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const name = newPlaylist.trim();
              if (!name) return;
              try {
                const playlist = await createPlaylist(name, user.id);
                setPlaylists((previous) => [playlist, ...previous]);
                setNewPlaylist("");
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not create playlist");
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              value={newPlaylist}
              onChange={(event) => setNewPlaylist(event.target.value)}
              placeholder="New playlist name"
              className="w-48 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500"
            >
              Create
            </button>
          </form>
        </div>
        {playlists.length === 0 ? (
          <p className="text-sm text-neutral-500">No playlists yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <li
                key={playlist.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-3"
              >
                <Link href={`/playlist/${playlist.id}`} className="min-w-0">
                  <p className="truncate font-medium">{playlist.name}</p>
                  <p className="text-xs text-neutral-500">
                    {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const next = !playlist.isPublic;
                    await setPlaylistVisibility(playlist.id, next);
                    setPlaylists((previous) =>
                      previous.map((item) =>
                        item.id === playlist.id ? { ...item, isPublic: next } : item,
                      ),
                    );
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                    playlist.isPublic
                      ? "border-emerald-600 text-emerald-400"
                      : "border-neutral-700 text-neutral-400"
                  }`}
                >
                  {playlist.isPublic ? "Public" : "Private"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-1 flex-col gap-3">
        <h2 className="text-lg font-semibold">Tracks</h2>
        {loading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div
            className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition ${
              dragging ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-900"
            }`}
          >
            <MusicIcon className="h-10 w-10 text-neutral-700" />
            <p className="font-medium">{tracks.length === 0 ? "No music yet" : "No matches"}</p>
            <p className="max-w-sm text-sm text-neutral-400">
              Drop mp3 files anywhere on this page, or use “Add music”.
            </p>
          </div>
        ) : (
          <TrackList
            tracks={filtered}
            onRemove={async (track) => {
              await deleteTrack(track);
              setTracks((previous) => previous.filter((item) => item.id !== track.id));
            }}
            renderActions={(track) =>
              playlists.length === 0 ? null : (
                <select
                  aria-label={`Add ${track.title} to a playlist`}
                  defaultValue=""
                  onChange={async (event) => {
                    const playlistId = event.target.value;
                    event.target.value = "";
                    if (!playlistId) return;
                    await addTrackToPlaylist(playlistId, track.id);
                    setPlaylists((previous) =>
                      previous.map((item) =>
                        item.id === playlistId
                          ? { ...item, trackCount: item.trackCount + 1 }
                          : item,
                      ),
                    );
                  }}
                  className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300 outline-none focus:border-emerald-500"
                >
                  <option value="">Add to…</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
              )
            }
          />
        )}
      </section>
    </div>
  );
}
