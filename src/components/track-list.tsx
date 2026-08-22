"use client";

import Image from "next/image";
import { usePlayer } from "@/components/player-provider";
import { MusicIcon, PauseIcon, PlayIcon, TrashIcon } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { Track } from "@/lib/library";

type TrackListProps = {
  tracks: Track[];
  showOwner?: boolean;
  onRemove?: (track: Track) => void;
  removeLabel?: string;
  renderActions?: (track: Track) => React.ReactNode;
};

export function TrackList({
  tracks,
  showOwner = false,
  onRemove,
  removeLabel = "Delete",
  renderActions,
}: TrackListProps) {
  const { currentTrack, isPlaying, toggleTrack } = usePlayer();

  return (
    <ul className="flex flex-col divide-y divide-neutral-900 overflow-hidden rounded-2xl border border-neutral-900">
      {tracks.map((track, index) => {
        const active = currentTrack?.id === track.id;
        return (
          <li
            key={track.id}
            className={`group flex items-center gap-4 px-4 py-3 transition hover:bg-neutral-900 ${
              active ? "bg-neutral-900" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggleTrack(tracks, index)}
              aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-neutral-800"
            >
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <MusicIcon className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
              )}
              <span
                data-active={active}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 data-[active=true]:opacity-100"
              >
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
                {showOwner ? ` · added by ${track.ownerName}` : ""}
              </p>
            </div>
            {renderActions ? renderActions(track) : null}
            <span className="w-12 text-right text-sm tabular-nums text-neutral-400">
              {formatTime(track.duration)}
            </span>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(track)}
                aria-label={`${removeLabel} ${track.title}`}
                className="rounded p-2 text-neutral-500 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
