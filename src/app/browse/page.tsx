"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPlaylists, type Playlist } from "@/lib/library";

export default function BrowsePage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlaylists()
      .then((data) => !cancelled && setPlaylists(data.filter((playlist) => playlist.isPublic)))
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Browse</h1>
        <p className="text-sm text-neutral-400">Public playlists shared by everyone</p>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : playlists.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing shared yet — create a public playlist in your library.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <Link
                href={`/playlist/${playlist.id}`}
                className="flex flex-col gap-1 rounded-xl border border-neutral-900 bg-neutral-950 px-4 py-4 transition hover:border-neutral-700"
              >
                <p className="truncate font-medium">{playlist.name}</p>
                <p className="text-xs text-neutral-500">
                  by {playlist.ownerName} · {playlist.trackCount}{" "}
                  {playlist.trackCount === 1 ? "track" : "tracks"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
