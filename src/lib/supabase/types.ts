export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
};

export type TrackRow = {
  id: string;
  owner_id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  size: number;
  audio_path: string;
  cover_path: string | null;
  created_at: string;
};

export type PlaylistRow = {
  id: string;
  owner_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
};

export type PlaylistTrackRow = {
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
};

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
};

export type ListeningActivityRow = {
  user_id: string;
  track_id: string | null;
  is_sharing: boolean;
  updated_at: string;
};

export type TrackLyricsRow = {
  track_id: string;
  owner_id: string;
  content: string;
  updated_at: string;
};

export type VideoRow = {
  id: string;
  owner_id: string;
  title: string;
  size: number;
  video_path: string;
  created_at: string;
};

export type UserModRow = {
  user_id: string;
  mod_id: string;
  settings: Record<string, unknown>;
  installed_at: string;
};

type TableConfig<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableConfig<ProfileRow, { id: string; display_name: string; avatar_path?: string | null }, Partial<Pick<ProfileRow, "display_name" | "avatar_path">>>;
      tracks: TableConfig<TrackRow, Omit<TrackRow, "id" | "created_at"> & { id?: string }, Partial<Omit<TrackRow, "id" | "owner_id" | "created_at">>>;
      playlists: TableConfig<PlaylistRow, Omit<PlaylistRow, "id" | "created_at" | "is_public"> & { id?: string; is_public?: boolean }, Partial<Pick<PlaylistRow, "name" | "is_public">>>;
      playlist_tracks: TableConfig<PlaylistTrackRow, Omit<PlaylistTrackRow, "added_at" | "position"> & { position?: number }, Partial<Pick<PlaylistTrackRow, "position">>>;
      friendships: TableConfig<FriendshipRow, Omit<FriendshipRow, "id" | "created_at" | "status"> & { status?: FriendshipRow["status"] }, Partial<Pick<FriendshipRow, "status">>>;
      listening_activity: TableConfig<ListeningActivityRow, Omit<ListeningActivityRow, "updated_at"> & { updated_at?: string }, Partial<Pick<ListeningActivityRow, "track_id" | "is_sharing" | "updated_at">>>;
      track_lyrics: TableConfig<TrackLyricsRow, Omit<TrackLyricsRow, "updated_at"> & { updated_at?: string }, Partial<Pick<TrackLyricsRow, "content" | "updated_at">>>;
      videos: TableConfig<VideoRow, Omit<VideoRow, "id" | "created_at"> & { id?: string }, Partial<Pick<VideoRow, "title">>>;
      user_mods: TableConfig<UserModRow, Omit<UserModRow, "installed_at">, Partial<Pick<UserModRow, "settings">>>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
