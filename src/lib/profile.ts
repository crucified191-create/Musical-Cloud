"use client";

import { getSupabaseClient } from "@/lib/supabase/client";

export async function fetchAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient().from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.avatar_path ? getSupabaseClient().storage.from("media").getPublicUrl(data.avatar_path).data.publicUrl : null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile pictures must be 5 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await getSupabaseClient().storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error: profileError } = await getSupabaseClient().from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (profileError) throw profileError;
  return getSupabaseClient().storage.from("media").getPublicUrl(path).data.publicUrl;
}
