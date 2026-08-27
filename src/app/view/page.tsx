"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MusicIcon, TrashIcon } from "@/components/icons";
import {
  addVideoToPlaylist,
  createVideoPlaylist,
  deleteVideo,
  fetchVideoIdsInPlaylist,
  fetchVideoPlaylists,
  fetchVideos,
  isMp4File,
  removeVideoFromPlaylist,
  uploadVideo,
  type Video,
  type VideoPlaylist,
} from "@/lib/library";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function ViewPage() {
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylistVideoIds, setActivePlaylistVideoIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [newPlaylist, setNewPlaylist] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setVideos([]);
      setPlaylists([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchVideos(user.id), fetchVideoPlaylists(user.id)])
      .then(([items, lists]) => {
        if (cancelled) return;
        setVideos(items);
        setPlaylists(lists);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!activePlaylistId) {
      setActivePlaylistVideoIds(new Set());
      return;
    }
    let cancelled = false;
    fetchVideoIdsInPlaylist(activePlaylistId)
      .then((ids) => !cancelled && setActivePlaylistVideoIds(new Set(ids)))
      .catch((caught: Error) => !cancelled && setError(caught.message));
    return () => {
      cancelled = true;
    };
  }, [activePlaylistId]);

  const visibleVideos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesSearch = !term || video.title.toLowerCase().includes(term);
      return matchesSearch && (!activePlaylistId || activePlaylistVideoIds.has(video.id));
    });
  }, [activePlaylistId, activePlaylistVideoIds, query, videos]);

  const selected = videos.find((video) => video.id === selectedId) ?? visibleVideos[0] ?? null;
  const activePlaylist = playlists.find((playlist) => playlist.id === activePlaylistId) ?? null;

  const chooseFile = async (file: File | undefined) => {
    if (!user || !file) return;
    if (!isMp4File(file)) {
      setError("Choose an MP4 video file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const video = await uploadVideo(file, user.id);
      setVideos((items) => [video, ...items]);
      setSelectedId(video.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload this video.");
    } finally {
      setUploading(false);
    }
  };

  const refreshActivePlaylist = async () => {
    if (!activePlaylistId) return;
    const ids = await fetchVideoIdsInPlaylist(activePlaylistId);
    setActivePlaylistVideoIds(new Set(ids));
  };

  if (authLoading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <MusicIcon className="h-10 w-10 text-neutral-700" />
        <h1 className="text-2xl font-semibold">Your cloud video library</h1>
        <p className="max-w-md text-sm text-neutral-400">Sign in to upload and organize MP4 files in private playlists.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">View</p>
          <h1 className="text-3xl font-bold tracking-tight">Cloud video library</h1>
          <p className="mt-1 text-sm text-neutral-400">Upload MP4s you own or are allowed to watch, then organize them by anime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your videos" className="w-48 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
            {uploading ? "Uploading…" : "Upload MP4"}
          </button>
          <input ref={inputRef} type="file" accept="video/mp4,.mp4" hidden onChange={(event) => { void chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setActivePlaylistId(null)} className={`rounded-full px-4 py-2 text-sm transition ${!activePlaylistId ? "bg-emerald-500 font-semibold text-black" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"}`}>All videos</button>
          {playlists.map((playlist) => (
            <button key={playlist.id} type="button" onClick={() => setActivePlaylistId(playlist.id)} className={`rounded-full px-4 py-2 text-sm transition ${activePlaylistId === playlist.id ? "bg-emerald-500 font-semibold text-black" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"}`}>
              {playlist.name} <span className="opacity-70">· {playlist.videoCount}</span>
            </button>
          ))}
          <form className="ml-auto flex items-center gap-2" onSubmit={async (event) => {
            event.preventDefault();
            const name = newPlaylist.trim();
            if (!name) return;
            try {
              const playlist = await createVideoPlaylist(name, user.id);
              setPlaylists((items) => [playlist, ...items]);
              setNewPlaylist("");
              setActivePlaylistId(playlist.id);
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not create playlist.");
            }
          }}>
            <input value={newPlaylist} onChange={(event) => setNewPlaylist(event.target.value)} placeholder="New anime playlist" maxLength={120} className="w-44 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500" />
            <button type="submit" className="rounded-full border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500">Create</button>
          </form>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading your library…</p>
      ) : videos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-900 p-16 text-center">
          <MusicIcon className="h-10 w-10 text-neutral-700" />
          <p className="font-medium">No videos yet</p>
          <p className="max-w-sm text-sm text-neutral-400">Upload an MP4, then create a playlist for each anime or season.</p>
        </div>
      ) : (
        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0">
            {selected ? (
              <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-2xl">
                <video key={selected.id} controls playsInline preload="metadata" className="aspect-video w-full bg-black">
                  <source src={selected.videoUrl} type="video/mp4" />
                  Your browser does not support MP4 playback.
                </video>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{selected.title}</h2>
                    <p className="mt-1 text-sm text-neutral-400">{formatSize(selected.size)}{activePlaylist ? ` · ${activePlaylist.name}` : ""}</p>
                  </div>
                  {playlists.length > 0 ? (
                    <select defaultValue="" onChange={async (event) => {
                      const playlistId = event.target.value;
                      event.target.value = "";
                      if (!playlistId) return;
                      try {
                        const added = await addVideoToPlaylist(playlistId, selected.id);
                        if (added) setPlaylists((items) => items.map((item) => item.id === playlistId ? { ...item, videoCount: item.videoCount + 1 } : item));
                        if (playlistId === activePlaylistId) await refreshActivePlaylist();
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Could not add this video to the playlist.");
                      }
                    }} className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-emerald-500">
                      <option value="">Add to playlist…</option>
                      {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
                    </select>
                  ) : null}
                </div>
              </div>
            ) : <p className="rounded-2xl border border-neutral-900 p-8 text-sm text-neutral-400">No video matches this playlist and search.</p>}
          </section>

          <aside className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/80">
            <div className="border-b border-neutral-900 px-4 py-3 text-sm font-semibold">{activePlaylist?.name ?? "Your videos"} · {visibleVideos.length}</div>
            <ul className="max-h-[34rem] divide-y divide-neutral-900 overflow-y-auto">
              {visibleVideos.map((video) => (
                <li key={video.id} className={video.id === selected?.id ? "bg-emerald-500/10" : ""}>
                  <div className="group flex items-center gap-3 px-4 py-3">
                    <button type="button" onClick={() => setSelectedId(video.id)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{video.title}</p><p className="mt-0.5 text-xs text-neutral-500">{formatSize(video.size)}</p></button>
                    {activePlaylist ? <button type="button" onClick={async () => {
                      try {
                        await removeVideoFromPlaylist(activePlaylist.id, video.id);
                        setPlaylists((items) => items.map((item) => item.id === activePlaylist.id ? { ...item, videoCount: Math.max(0, item.videoCount - 1) } : item));
                        await refreshActivePlaylist();
                      } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove this video from the playlist."); }
                    }} className="rounded px-2 py-1 text-xs text-neutral-400 hover:text-red-400">Remove</button> : null}
                    <button type="button" onClick={async () => {
                      try {
                        await deleteVideo(video);
                        setVideos((items) => {
                          const next = items.filter((item) => item.id !== video.id);
                          if (selectedId === video.id) setSelectedId(next[0]?.id ?? null);
                          return next;
                        });
                        if (activePlaylistId) await refreshActivePlaylist();
                      } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete this video."); }
                    }} aria-label={`Delete ${video.title}`} className="rounded p-2 text-neutral-500 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
