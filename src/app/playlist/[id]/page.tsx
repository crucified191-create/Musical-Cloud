"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePlayer } from "@/components/player-provider";
import { TrackList } from "@/components/track-list";
import { PlayIcon } from "@/components/icons";
import {
  addTracksToPlaylist,
  fetchPlaylist,
  fetchPlaylists,
  removeTrackFromPlaylist,
  setPlaylistVisibility,
  type Playlist,
  type Track,
} from "@/lib/library";

export default function PlaylistPage({ params }: PageProps<"/playlist/[id]">) {
  const { id } = use(params);
  const { user } = useAuth();
  const { playQueue } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ownPlaylists, setOwnPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlaylist(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError("This playlist is private or does not exist.");
          return;
        }
        setPlaylist(result.playlist);
        setTracks(result.tracks);
      })
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user) {
      setOwnPlaylists([]);
      return;
    }
    let cancelled = false;
    fetchPlaylists(user.id)
      .then((items) => !cancelled && setOwnPlaylists(items))
      .catch(() => !cancelled && setOwnPlaylists([]));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isOwner = Boolean(user && playlist && user.id === playlist.ownerId);
  const destinationPlaylists = ownPlaylists.filter((item) => item.id !== playlist?.id);

  if (loading) return <p className="px-6 py-10 text-sm text-neutral-400">Loading…</p>;
  if (error || !playlist)
    return <p className="px-6 py-10 text-sm text-red-400">{error ?? "Not found"}</p>;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Playlist</p>
          <h1 className="text-3xl font-bold tracking-tight">{playlist.name}</h1>
          <p className="text-sm text-neutral-400">
            by {playlist.ownerName} · {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
            {isOwner ? (playlist.isPublic ? " · public" : " · private") : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={tracks.length === 0}
            onClick={() => playQueue(tracks, 0)}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <PlayIcon className="h-4 w-4" />
            Play
          </button>
          {isOwner ? (
            <button
              type="button"
              onClick={async () => {
                const next = !playlist.isPublic;
                await setPlaylistVisibility(playlist.id, next);
                setPlaylist({ ...playlist, isPublic: next });
              }}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm transition hover:border-neutral-500"
            >
              Make {playlist.isPublic ? "private" : "public"}
            </button>
          ) : null}
        </div>
      </header>

      {tracks.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {isOwner ? "Add tracks from your library." : "This playlist is empty."}
        </p>
      ) : (
        <TrackList
          tracks={tracks}
          showOwner
          playlists={destinationPlaylists}
          onAddToPlaylist={async (playlistId, selectedTracks) => {
            await addTracksToPlaylist(playlistId, selectedTracks.map((track) => track.id));
          }}
          removeLabel="Remove from this playlist"
          onRemove={
            isOwner
              ? async (track) => {
                  await removeTrackFromPlaylist(playlist.id, track.id);
                  setTracks((previous) => previous.filter((item) => item.id !== track.id));
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
