"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TrackList } from "@/components/track-list";
import { fetchTracks, type Track } from "@/lib/library";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTracks().then((result) => !cancelled && setTracks(result))
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return tracks.filter((track) => {
      const haystack = [track.title, track.artist, track.album, track.ownerName].join(" ").toLocaleLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [query, tracks]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Search music</h1>
        <p className="mt-1 text-sm text-neutral-400">Find tracks uploaded to Riff by title, artist, album, or uploader.</p>
      </header>
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you want to hear?" className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 px-5 py-3 text-base outline-none placeholder:text-neutral-500 focus:border-emerald-500" />
      {loading ? <p className="text-sm text-neutral-400">Loading tracks…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && query.trim() && results.length === 0 ? (
        <div className="rounded-2xl border border-neutral-900 p-8 text-sm text-neutral-400">No uploaded tracks matched “{query.trim()}”.</div>
      ) : null}
      {results.length > 0 ? <section className="flex flex-col gap-3"><p className="text-sm text-neutral-400">{results.length} result{results.length === 1 ? "" : "s"}</p><TrackList tracks={results} showOwner /></section> : null}
      {!query.trim() && !loading ? <p className="text-sm text-neutral-500">Start typing to search the {tracks.length} tracks currently on Riff. <Link href="/browse" className="text-emerald-400 hover:underline">Browse public playlists</Link></p> : null}
    </div>
  );
}
