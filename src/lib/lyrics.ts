"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

export type LyricLine = { time: number | null; text: string };
export type LyricsLookup = { content: string; source: "LRCLIB" | "Lyrics.ovh"; synced: boolean };

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

export async function lookupLyrics(title: string, artist: string, album: string, duration: number): Promise<LyricsLookup | null> {
  const query = new URLSearchParams({ title, artist });
  if (album) query.set("album", album);
  if (duration > 0) query.set("duration", String(Math.round(duration)));
  const response = await fetch(`/api/lyrics?${query.toString()}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Lyrics lookup is unavailable right now.");
  return response.json() as Promise<LyricsLookup>;
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
