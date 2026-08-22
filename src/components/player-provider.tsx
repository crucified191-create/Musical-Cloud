"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Track } from "@/lib/library";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playQueue: (tracks: Track[], startIndex: number) => void;
  toggleTrack: (tracks: Track[], index: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
    };
  }, []);

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null;

  const start = useCallback((tracks: Track[], startIndex: number) => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;
    const target = tracks[startIndex];
    if (!target) return;
    setQueue(tracks);
    setIndex(startIndex);
    setProgress(0);
    audio.src = target.audioUrl;
    void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const toggleTrack = useCallback(
    (tracks: Track[], targetIndex: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const target = tracks[targetIndex];
      if (!target) return;
      if (currentTrack?.id === target.id) {
        if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
        return;
      }
      start(tracks, targetIndex);
    },
    [currentTrack, start],
  );

  const step = useCallback(
    (offset: number) => {
      if (queue.length === 0) return;
      if (shuffle && queue.length > 1) {
        let next = Math.floor(Math.random() * queue.length);
        if (next === index) next = (next + 1) % queue.length;
        start(queue, next);
        return;
      }
      const next = index + offset;
      if (next < 0) {
        start(queue, queue.length - 1);
        return;
      }
      if (next >= queue.length) {
        if (repeat === "all") start(queue, 0);
        return;
      }
      start(queue, next);
    },
    [index, queue, repeat, shuffle, start],
  );

  const playNext = useCallback(() => step(1), [step]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    step(-1);
  }, [step]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play().catch(() => setIsPlaying(false));
        return;
      }
      playNext();
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playNext, repeat]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      if (queue.length > 0) start(queue, 0);
      return;
    }
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [currentTrack, queue, start]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setProgress(seconds);
  }, []);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    if (audioRef.current) audioRef.current.volume = value;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((value) => !value), []);

  const cycleRepeat = useCallback(
    () => setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off")),
    [],
  );

  const value = useMemo<PlayerState>(
    () => ({
      queue,
      currentTrack,
      isPlaying,
      progress,
      volume,
      shuffle,
      repeat,
      playQueue: start,
      toggleTrack,
      togglePlay,
      playNext,
      playPrevious,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      queue,
      currentTrack,
      isPlaying,
      progress,
      volume,
      shuffle,
      repeat,
      start,
      toggleTrack,
      togglePlay,
      playNext,
      playPrevious,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
