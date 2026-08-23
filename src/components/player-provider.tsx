"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { Track } from "@/lib/library";
import { fetchListeningPreference, setListeningActivity } from "@/lib/social";

export type RepeatMode = "off" | "all" | "one";
export type EqualizerSettings = { low: number; mid: number; high: number };

type PlayerState = {
  queue: Track[]; currentTrack: Track | null; isPlaying: boolean; progress: number; volume: number; shuffle: boolean; repeat: RepeatMode; equalizer: EqualizerSettings;
  playQueue: (tracks: Track[], startIndex: number) => void; toggleTrack: (tracks: Track[], index: number) => void; togglePlay: () => void; playNext: () => void; playPrevious: () => void; seek: (seconds: number) => void; setVolume: (value: number) => void; setEqualizer: (band: keyof EqualizerSettings, value: number) => void; toggleShuffle: () => void; cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);
export function usePlayer(): PlayerState {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<number[]>([]);
  const reportedTrackRef = useRef<string | null>(null);
  const filtersRef = useRef<Partial<Record<keyof EqualizerSettings, BiquadFilterNode>>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [equalizer, setEqualizerState] = useState<EqualizerSettings>({ low: 0, mid: 0, high: 0 });

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaElementSource(audio);
      const low = context.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 320;
      const mid = context.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = 0.8;
      const high = context.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 3200;
      source.connect(low).connect(mid).connect(high).connect(context.destination);
      filtersRef.current = { low, mid, high };
    } catch { /* Audio still works without the Web Audio API. */ }
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate); audio.removeEventListener("play", onPlay); audio.removeEventListener("pause", onPause);
      audio.pause(); audioContextRef.current = null; void context?.close();
    };
  }, []);

  const currentTrack = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    if (!user || !currentTrack) return;
    if (!isPlaying) {
      reportedTrackRef.current = null;
      void fetchListeningPreference(user.id).then((sharing) => sharing && setListeningActivity(user.id, null, true)).catch(() => undefined);
      return;
    }
    if (reportedTrackRef.current === currentTrack.id) return;
    reportedTrackRef.current = currentTrack.id;
    void fetchListeningPreference(user.id).then((sharing) => sharing && setListeningActivity(user.id, currentTrack.id, true)).catch(() => undefined);
  }, [currentTrack, isPlaying, user]);

  const playAt = useCallback((tracks: Track[], targetIndex: number, resetHistory = false) => {
    const audio = audioRef.current; const target = tracks[targetIndex];
    if (!audio || !target) return;
    if (resetHistory) historyRef.current = [targetIndex];
    else if (historyRef.current[historyRef.current.length - 1] !== targetIndex) historyRef.current.push(targetIndex);
    reportedTrackRef.current = null;
    setQueue(tracks); setIndex(targetIndex); setProgress(0);
    void audioContextRef.current?.resume(); audio.src = target.audioUrl; void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const playQueue = useCallback((tracks: Track[], startIndex: number) => { if (tracks.length > 0) playAt(tracks, startIndex, true); }, [playAt]);
  const toggleTrack = useCallback((tracks: Track[], targetIndex: number) => {
    const audio = audioRef.current; const target = tracks[targetIndex];
    if (!audio || !target) return;
    if (currentTrack?.id === target.id) { if (audio.paused) void audio.play().catch(() => setIsPlaying(false)); else audio.pause(); return; }
    playQueue(tracks, targetIndex);
  }, [currentTrack, playQueue]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    let nextIndex: number;
    if (shuffle && queue.length > 1) { do { nextIndex = Math.floor(Math.random() * queue.length); } while (nextIndex === index); }
    else { nextIndex = index + 1; if (nextIndex >= queue.length) { if (repeat !== "all") return; nextIndex = 0; } }
    playAt(queue, nextIndex);
  }, [index, playAt, queue, repeat, shuffle]);

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; setProgress(0); return; }
    const history = historyRef.current;
    if (history.length > 1) { history.pop(); const previousIndex = history[history.length - 1]; if (previousIndex !== undefined) playAt(queue, previousIndex); return; }
    if (queue.length > 0 && index > 0) playAt(queue, index - 1, true);
  }, [index, playAt, queue]);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const onEnded = () => { if (repeat === "one") { audio.currentTime = 0; void audio.play().catch(() => setIsPlaying(false)); return; } playNext(); };
    audio.addEventListener("ended", onEnded); return () => audio.removeEventListener("ended", onEnded);
  }, [playNext, repeat]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current; if (!audio) return;
    if (!currentTrack) { if (queue.length > 0) playQueue(queue, 0); return; }
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false)); else audio.pause();
  }, [currentTrack, playQueue, queue]);
  const seek = useCallback((seconds: number) => { const audio = audioRef.current; if (!audio) return; audio.currentTime = seconds; setProgress(seconds); }, []);
  const setVolume = useCallback((value: number) => { setVolumeState(value); if (audioRef.current) audioRef.current.volume = value; }, []);
  const setEqualizer = useCallback((band: keyof EqualizerSettings, value: number) => { setEqualizerState((previous) => ({ ...previous, [band]: value })); const filter = filtersRef.current[band]; if (filter) filter.gain.value = value; }, []);
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), []);
  const cycleRepeat = useCallback(() => setRepeat((mode) => mode === "off" ? "all" : mode === "all" ? "one" : "off"), []);

  const value = useMemo<PlayerState>(() => ({
    queue, currentTrack, isPlaying, progress, volume, shuffle, repeat, equalizer, playQueue, toggleTrack, togglePlay, playNext, playPrevious, seek, setVolume, setEqualizer, toggleShuffle, cycleRepeat,
  }), [queue, currentTrack, isPlaying, progress, volume, shuffle, repeat, equalizer, playQueue, toggleTrack, togglePlay, playNext, playPrevious, seek, setVolume, setEqualizer, toggleShuffle, cycleRepeat]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
