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
import { deleteTrack, getAllTracks, type Track } from "@/lib/db";
import { importFile, isAudioFile } from "@/lib/import";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  tracks: Track[];
  coverUrls: Record<string, string>;
  loading: boolean;
  importing: { done: number; total: number } | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  playTrack: (id: string) => void;
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
  const objectUrlRef = useRef<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
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
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllTracks()
      .then((stored) => {
        if (!cancelled) setTracks(stored);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const coverUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    for (const track of tracks) {
      if (track.cover) urls[track.id] = URL.createObjectURL(track.cover);
    }
    return urls;
  }, [tracks]);

  useEffect(
    () => () => {
      for (const url of Object.values(coverUrls)) URL.revokeObjectURL(url);
    },
    [coverUrls],
  );

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentId) ?? null,
    [tracks, currentId],
  );

  const load = useCallback((track: Track, autoplay: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(track.data);
    objectUrlRef.current = url;
    audio.src = url;
    setCurrentId(track.id);
    setProgress(0);
    if (autoplay) void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const playTrack = useCallback(
    (id: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (id === currentId) {
        if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
        return;
      }
      const track = tracks.find((item) => item.id === id);
      if (track) load(track, true);
    },
    [currentId, load, tracks],
  );

  const pickNext = useCallback(
    (offset: number) => {
      if (tracks.length === 0) return null;
      if (shuffle && tracks.length > 1) {
        let index = Math.floor(Math.random() * tracks.length);
        if (tracks[index].id === currentId) index = (index + 1) % tracks.length;
        return tracks[index];
      }
      const index = tracks.findIndex((track) => track.id === currentId);
      if (index === -1) return tracks[0];
      const nextIndex = index + offset;
      if (nextIndex < 0) return tracks[tracks.length - 1];
      if (nextIndex >= tracks.length) return repeat === "all" ? tracks[0] : null;
      return tracks[nextIndex];
    },
    [currentId, repeat, shuffle, tracks],
  );

  const playNext = useCallback(() => {
    const next = pickNext(1);
    if (next) load(next, true);
  }, [load, pickNext]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const previous = pickNext(-1);
    if (previous) load(previous, true);
  }, [load, pickNext]);

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

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(isAudioFile);
    if (audioFiles.length === 0) return;
    setImporting({ done: 0, total: audioFiles.length });
    const imported: Track[] = [];
    for (const [index, file] of audioFiles.entries()) {
      try {
        imported.push(await importFile(file));
      } catch (error) {
        console.error(`Failed to import ${file.name}`, error);
      }
      setImporting({ done: index + 1, total: audioFiles.length });
    }
    setTracks((previous) => [...imported.reverse(), ...previous]);
    setImporting(null);
  }, []);

  const removeTrack = useCallback(
    async (id: string) => {
      await deleteTrack(id);
      setTracks((previous) => previous.filter((track) => track.id !== id));
      if (id === currentId) {
        audioRef.current?.pause();
        setCurrentId(null);
        setProgress(0);
      }
    },
    [currentId],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentId) {
      if (tracks.length > 0) load(tracks[0], true);
      return;
    }
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [currentId, load, tracks]);

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

  const value: PlayerState = {
    tracks,
    coverUrls,
    loading,
    importing,
    currentTrack,
    isPlaying,
    progress,
    volume,
    shuffle,
    repeat,
    addFiles,
    removeTrack,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
