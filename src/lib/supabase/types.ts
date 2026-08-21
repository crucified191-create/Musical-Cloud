export type ProfileRow = {
  id: string;
  display_name: string;
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

type TableConfig<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableConfig<
        ProfileRow,
        { id: string; display_name: string },
        Partial<Pick<ProfileRow, "display_name">>
      >;
      tracks: TableConfig<
        TrackRow,
        Omit<TrackRow, "id" | "created_at"> & { id?: string },
        Partial<Omit<TrackRow, "id" | "owner_id" | "created_at">>
      >;
      playlists: TableConfig<
        PlaylistRow,
        Omit<PlaylistRow, "id" | "created_at" | "is_public"> & {
          id?: string;
          is_public?: boolean;
        },
        Partial<Pick<PlaylistRow, "name" | "is_public">>
      >;
      playlist_tracks: TableConfig<
        PlaylistTrackRow,
        Omit<PlaylistTrackRow, "added_at" | "position"> & { position?: number },
        Partial<Pick<PlaylistTrackRow, "position">>
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
