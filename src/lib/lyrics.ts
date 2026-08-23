"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

export type LyricLine = { time: number | null; text: string };
export type LyricsLookup = { content: string; source: "LRCLIB" | "Lyrics.ovh"; synced: boolean };
const lookupCache = new Map<string, Promise<LyricsLookup | null>>();

export function parseLyrics(content: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const source of content.replace(/\r/g, "").split("\n")) {
    const matches = [...source.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = source.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    if (matches.length) for (const match of matches) lines.push({ time: Number(match[1]) * 60 + Number(match[2]), text });
    else if (text) lines.push({ time: null, text });
  }
  return lines;
}

function lyricKey(title: string, artist: string, album: string, duration: number) {
  return [title, artist, album, Math.round(duration)].map((value) => value.trim?.().toLowerCase?.() ?? value).join("|");
}

export function lookupLyrics(title: string, artist: string, album: string, duration: number): Promise<LyricsLookup | null> {
  const key = lyricKey(title, artist, album, duration);
  const existing = lookupCache.get(key);
  if (existing) return existing;

  const request = (async () => {
    const storageKey = `riff:lyrics:${key}`;
    try {
      const cached = window.sessionStorage.getItem(storageKey);
      if (cached !== null) return JSON.parse(cached) as LyricsLookup | null;
    } catch { /* Storage can be unavailable in private browsing modes. */ }

    const query = new URLSearchParams({ title, artist });
    if (album) query.set("album", album);
    if (duration > 0) query.set("duration", String(Math.round(duration)));
    const response = await fetch(`/api/lyrics?${query.toString()}`);
    if (response.status === 404) {
      try { window.sessionStorage.setItem(storageKey, "null"); } catch { /* Ignore unavailable storage. */ }
      return null;
    }
    if (!response.ok) throw new Error("Lyrics lookup is unavailable right now.");
    const found = await response.json() as LyricsLookup;
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(found)); } catch { /* Ignore unavailable storage. */ }
    return found;
  })();

  lookupCache.set(key, request);
  return request;
}

export async function fetchLyrics(trackId: string): Promise<string> {
  const { data, error } = await getSupabaseClient().from("track_lyrics").select("content").eq("track_id", trackId).maybeSingle();
  if (error) throw error;
  return data?.content ?? "";
}

export async function saveLyrics(trackId: string, ownerId: string, content: string): Promise<void> {
  const { error } = await getSupabaseClient().from("track_lyrics").upsert({ track_id: trackId, owner_id: ownerId, content, updated_at: new Date().toISOString() });
  if (error) throw error;
}
