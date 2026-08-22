"use client";

import { parseBlob } from "music-metadata";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PlaylistRow, TrackRow } from "@/lib/supabase/types";

const BUCKET = "media";
const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

export type Track = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  size: number;
  audioUrl: string;
  coverUrl: string | null;
  audioPath: string;
  coverPath: string | null;
};

export type Playlist = {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  isPublic: boolean;
  trackCount: number;
  createdAt: string;
};

type TrackRowWithProfile = TrackRow & { profiles: { display_name: string } | null };
type PlaylistRowWithProfile = PlaylistRow & {
  profiles: { display_name: string } | null;
  playlist_tracks: { count: number }[];
};

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);
}

function publicUrl(path: string): string {
  return getSupabaseClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function toTrack(row: TrackRowWithProfile): Track {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.profiles?.display_name ?? "Unknown",
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    size: row.size,
    audioUrl: publicUrl(row.audio_path),
    coverUrl: row.cover_path ? publicUrl(row.cover_path) : null,
    audioPath: row.audio_path,
    coverPath: row.cover_path,
  };
}

function toPlaylist(row: PlaylistRowWithProfile): Playlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.profiles?.display_name ?? "Unknown",
    name: row.name,
    isPublic: row.is_public,
    trackCount: row.playlist_tracks?.[0]?.count ?? 0,
    createdAt: row.created_at,
  };
}

const TRACK_SELECT = "*, profiles(display_name)";
const PLAYLIST_SELECT = "*, profiles(display_name), playlist_tracks(count)";

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function extensionOf(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "mp3";
}

function durationFromFile(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

export async function fetchTracks(ownerId?: string): Promise<Track[]> {
  const query = getSupabaseClient()
    .from("tracks")
    .select(TRACK_SELECT)
    .order("created_at", { ascending: false });
  const { data, error } = ownerId ? await query.eq("owner_id", ownerId) : await query;
  if (error) throw error;
  return (data as unknown as TrackRowWithProfile[]).map(toTrack);
}

export async function uploadTrack(file: File, userId: string): Promise<Track> {
  const supabase = getSupabaseClient();
  let title = stripExtension(file.name);
  let artist = "Unknown artist";
  let album = "";
  let duration = 0;
  let cover: { blob: Blob; extension: string } | null = null;

  try {
    const { common, format } = await parseBlob(file, { duration: true });
    if (common.title) title = common.title;
    if (common.artist) artist = common.artist;
    if (common.album) album = common.album;
    if (format.duration) duration = format.duration;
    const picture = common.picture?.[0];
    if (picture) {
      cover = {
        blob: new Blob([new Uint8Array(picture.data)], { type: picture.format }),
        extension: picture.format.split("/")[1] ?? "jpg",
      };
    }
  } catch {
    // Missing or unreadable tags: fall back to the file name.
  }

  if (!duration) duration = await durationFromFile(file);

  const trackId = crypto.randomUUID();
  const audioPath = `${userId}/${trackId}.${extensionOf(file.name)}`;
  const upload = await supabase.storage.from(BUCKET).upload(audioPath, file, {
    contentType: file.type || "audio/mpeg",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  let coverPath: string | null = null;
  if (cover) {
    coverPath = `${userId}/${trackId}-cover.${cover.extension}`;
    const coverUpload = await supabase.storage.from(BUCKET).upload(coverPath, cover.blob, {
      contentType: cover.blob.type,
      upsert: false,
    });
    if (coverUpload.error) coverPath = null;
  }

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      id: trackId,
      owner_id: userId,
      title,
      artist,
      album,
      duration,
      size: file.size,
      audio_path: audioPath,
      cover_path: coverPath,
    })
    .select(TRACK_SELECT)
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([audioPath]);
    throw error;
  }
  return toTrack(data as unknown as TrackRowWithProfile);
}

export async function deleteTrack(track: Track): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) throw error;
  const paths = [track.audioPath, ...(track.coverPath ? [track.coverPath] : [])];
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function fetchPlaylists(ownerId?: string): Promise<Playlist[]> {
  const query = getSupabaseClient()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .order("created_at", { ascending: false });
  const { data, error } = ownerId ? await query.eq("owner_id", ownerId) : await query;
  if (error) throw error;
  return (data as unknown as PlaylistRowWithProfile[]).map(toPlaylist);
}

export async function fetchPlaylist(
  id: string,
): Promise<{ playlist: Playlist; tracks: Track[] } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const entries = await supabase
    .from("playlist_tracks")
    .select(`position, tracks(${TRACK_SELECT})`)
    .eq("playlist_id", id)
    .order("position", { ascending: true });
  if (entries.error) throw entries.error;

  const rows = entries.data as unknown as { tracks: TrackRowWithProfile | null }[];
  return {
    playlist: toPlaylist(data as unknown as PlaylistRowWithProfile),
    tracks: rows.flatMap((entry) => (entry.tracks ? [toTrack(entry.tracks)] : [])),
  };
}

export async function createPlaylist(
  name: string,
  userId: string,
  isPublic = true,
): Promise<Playlist> {
  const { data, error } = await getSupabaseClient()
    .from("playlists")
    .insert({ name, owner_id: userId, is_public: isPublic })
    .select(PLAYLIST_SELECT)
    .single();
  if (error) throw error;
  return toPlaylist(data as unknown as PlaylistRowWithProfile);
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function setPlaylistVisibility(id: string, isPublic: boolean): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("playlists")
    .update({ is_public: isPublic })
    .eq("id", id);
  if (error) throw error;
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { count } = await supabase
    .from("playlist_tracks")
    .select("track_id", { count: "exact", head: true })
    .eq("playlist_id", playlistId);
  const { error } = await supabase
    .from("playlist_tracks")
    .insert({ playlist_id: playlistId, track_id: trackId, position: count ?? 0 });
  if (error && error.code !== "23505") throw error;
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("playlist_tracks")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("track_id", trackId);
  if (error) throw error;
}
