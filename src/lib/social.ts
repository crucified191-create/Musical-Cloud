"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { Track } from "@/lib/library";

export type Person = { id: string; displayName: string };
export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted";
  createdAt: string;
  other: Person;
  outgoing: boolean;
};
export type FriendActivity = {
  user: Person;
  track: Pick<Track, "id" | "title" | "artist" | "album" | "coverUrl" | "audioUrl" | "duration" | "ownerId" | "ownerName" | "size" | "audioPath" | "coverPath">;
  updatedAt: string;
};

export async function findPeople(query: string, currentUserId: string): Promise<Person[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("id, display_name")
    .ilike("display_name", `%${needle}%`)
    .neq("id", currentUserId)
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name }));
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await getSupabaseClient()
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at, requester:profiles!friendships_requester_id_fkey(id, display_name), addressee:profiles!friendships_addressee_id_fkey(id, display_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{
    id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted"; created_at: string;
    requester: { id: string; display_name: string } | null; addressee: { id: string; display_name: string } | null;
  }>).map((row) => {
    const outgoing = row.requester_id === userId;
    const person = outgoing ? row.addressee : row.requester;
    return {
      id: row.id,
      requesterId: row.requester_id,
      addresseeId: row.addressee_id,
      status: row.status,
      createdAt: row.created_at,
      other: { id: person?.id ?? (outgoing ? row.addressee_id : row.requester_id), displayName: person?.display_name ?? "Unknown" },
      outgoing,
    };
  });
}

export async function sendFriendRequest(userId: string, personId: string): Promise<void> {
  const { error } = await getSupabaseClient().from("friendships").insert({ requester_id: userId, addressee_id: personId });
  if (error) throw error;
}

export async function acceptFriendRequest(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("friendships").update({ status: "accepted" }).eq("id", id);
  if (error) throw error;
}

export async function removeFriendship(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from("friendships").delete().eq("id", id);
  if (error) throw error;
}

export async function setListeningActivity(userId: string, trackId: string | null, isSharing: boolean): Promise<void> {
  const { error } = await getSupabaseClient().from("listening_activity").upsert(
    { user_id: userId, track_id: trackId, is_sharing: isSharing, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function fetchListeningPreference(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().from("listening_activity").select("is_sharing").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.is_sharing ?? false;
}

export async function fetchFriendActivity(): Promise<FriendActivity[]> {
  const { data, error } = await getSupabaseClient()
    .from("listening_activity")
    .select("updated_at, profiles(display_name), tracks(id, owner_id, title, artist, album, duration, size, audio_path, cover_path)")
    .not("track_id", "is", null)
    .eq("is_sharing", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const supabase = getSupabaseClient();
  return ((data ?? []) as unknown as Array<{ updated_at: string; profiles: { display_name: string } | null; tracks: { id: string; owner_id: string; title: string; artist: string; album: string; duration: number; size: number; audio_path: string; cover_path: string | null } | null; user_id?: string }>).flatMap((row) => {
    if (!row.tracks) return [];
    const publicUrl = (path: string) => supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    return [{
      user: { id: row.user_id ?? "", displayName: row.profiles?.display_name ?? "A friend" },
      updatedAt: row.updated_at,
      track: {
        id: row.tracks.id, ownerId: row.tracks.owner_id, ownerName: row.profiles?.display_name ?? "Unknown",
        title: row.tracks.title, artist: row.tracks.artist, album: row.tracks.album, duration: row.tracks.duration,
        size: row.tracks.size, audioPath: row.tracks.audio_path, coverPath: row.tracks.cover_path,
        audioUrl: publicUrl(row.tracks.audio_path), coverUrl: row.tracks.cover_path ? publicUrl(row.tracks.cover_path) : null,
      },
    }];
  });
}
