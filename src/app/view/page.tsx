"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MusicIcon, TrashIcon } from "@/components/icons";
import {
  deleteVideo,
  fetchVideos,
  isMp4File,
  uploadVideo,
  type Video,
} from "@/lib/library";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function ViewPage() {
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setVideos([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchVideos(user.id)
      .then((items) => {
        if (cancelled) return;
        setVideos(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visibleVideos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? videos.filter((video) => video.title.toLowerCase().includes(term)) : videos;
  }, [query, videos]);

  const selected = videos.find((video) => video.id === selectedId) ?? visibleVideos[0] ?? null;

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

  if (authLoading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <MusicIcon className="h-10 w-10 text-neutral-700" />
        <h1 className="text-2xl font-semibold">Your cloud video library</h1>
        <p className="max-w-md text-sm text-neutral-400">Sign in to upload and watch MP4 files from your private library.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">View</p>
          <h1 className="text-3xl font-bold tracking-tight">Cloud video library</h1>
          <p className="mt-1 text-sm text-neutral-400">Upload MP4s you own or are allowed to watch.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your videos"
            className="w-48 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload MP4"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,.mp4"
            hidden
            onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading your library…</p>
      ) : videos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-900 p-16 text-center">
          <MusicIcon className="h-10 w-10 text-neutral-700" />
          <p className="font-medium">No videos yet</p>
          <p className="max-w-sm text-sm text-neutral-400">Upload an MP4 to start your private cloud video library.</p>
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
                <div className="bg-neutral-950 px-5 py-4">
                  <h2 className="truncate text-lg font-semibold">{selected.title}</h2>
                  <p className="mt-1 text-sm text-neutral-400">{formatSize(selected.size)}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-neutral-900 p-8 text-sm text-neutral-400">No video matches your search.</p>
            )}
          </section>

          <aside className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/80">
            <div className="border-b border-neutral-900 px-4 py-3 text-sm font-semibold">
              Your videos · {visibleVideos.length}
            </div>
            <ul className="max-h-[34rem] divide-y divide-neutral-900 overflow-y-auto">
              {visibleVideos.map((video) => (
                <li key={video.id} className={video.id === selected?.id ? "bg-emerald-500/10" : ""}>
                  <div className="group flex items-center gap-3 px-4 py-3">
                    <button type="button" onClick={() => setSelectedId(video.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{video.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{formatSize(video.size)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteVideo(video);
                          setVideos((items) => {
                            const next = items.filter((item) => item.id !== video.id);
                            if (selectedId === video.id) setSelectedId(next[0]?.id ?? null);
                            return next;
                          });
                        } catch (caught) {
                          setError(caught instanceof Error ? caught.message : "Could not delete this video.");
                        }
                      }}
                      aria-label={`Delete ${video.title}`}
                      className="rounded p-2 text-neutral-500 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
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
