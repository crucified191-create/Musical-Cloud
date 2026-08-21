"use client";

import Image from "next/image";
import { usePlayer } from "@/components/player-provider";
import {
  MusicIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from "@/components/icons";
import { formatTime } from "@/lib/format";

export function PlayerBar() {
  const {
    currentTrack,
    coverUrls,
    isPlaying,
    progress,
    volume,
    shuffle,
    repeat,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const duration = currentTrack?.duration ?? 0;
  const cover = currentTrack ? coverUrls[currentTrack.id] : undefined;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-neutral-800">
            {cover ? (
              <Image src={cover} alt="" fill unoptimized className="object-cover" />
            ) : (
              <MusicIcon className="absolute inset-0 m-auto h-5 w-5 text-neutral-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {currentTrack?.title ?? "Nothing playing"}
            </p>
            <p className="truncate text-xs text-neutral-400">{currentTrack?.artist ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-[2] flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              className={`transition hover:text-white ${shuffle ? "text-emerald-400" : "text-neutral-400"}`}
            >
              <ShuffleIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={playPrevious}
              aria-label="Previous track"
              className="text-neutral-300 transition hover:text-white"
            >
              <PreviousIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
            >
              {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={playNext}
              aria-label="Next track"
              className="text-neutral-300 transition hover:text-white"
            >
              <NextIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat}`}
              className={`transition hover:text-white ${repeat === "off" ? "text-neutral-400" : "text-emerald-400"}`}
            >
              <RepeatIcon className="h-4 w-4" one={repeat === "one"} />
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right text-xs tabular-nums text-neutral-400">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(progress, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!currentTrack}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-emerald-500"
            />
            <span className="w-10 text-xs tabular-nums text-neutral-400">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-2 sm:flex">
          <VolumeIcon className="h-4 w-4 text-neutral-400" muted={volume === 0} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-emerald-500"
          />
        </div>
      </div>
    </footer>
  );
}
