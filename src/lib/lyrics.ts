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
  const lrclibUrl = new URL("https://lrclib.net/api/get");
  lrclibUrl.searchParams.set("track_name", title);
  lrclibUrl.searchParams.set("artist_name", artist);
  if (album) lrclibUrl.searchParams.set("album_name", album);
  if (duration > 0) lrclibUrl.searchParams.set("duration", String(Math.round(duration)));
  try {
    const response = await fetch(lrclibUrl, { headers: { Accept: "application/json" } });
    if (response.ok) {
      const body = await response.json() as { syncedLyrics?: string | null; plainLyrics?: string | null };
      const content = body.syncedLyrics || body.plainLyrics;
      if (content) return { content, source: "LRCLIB", synced: Boolean(body.syncedLyrics) };
    }
  } catch { /* Try the plain-text fallback below. */ }

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (response.ok) {
      const body = await response.json() as { lyrics?: string };
      if (body.lyrics) return { content: body.lyrics, source: "Lyrics.ovh", synced: false };
    }
  } catch { /* No free provider returned lyrics. */ }
  return null;
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
