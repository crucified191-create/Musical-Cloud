-- Riff schema: profiles, tracks, playlists and public sharing.
-- Run this once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text not null default 'Unknown artist',
  album text not null default '',
  duration double precision not null default 0,
  size bigint not null default 0,
  audio_path text not null,
  cover_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

-- A request becomes a friendship only when the recipient accepts it.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One current-status row per listener. Sharing is opt-in and defaults off.
create table if not exists public.listening_activity (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  track_id uuid references public.tracks (id) on delete set null,
  is_sharing boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Mods are curated client-side options; this table only stores a user's installations.
create table if not exists public.user_mods (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mod_id text not null,
  settings jsonb not null default '{}'::jsonb,
  installed_at timestamptz not null default now(),
  primary key (user_id, mod_id)
);

create index if not exists tracks_owner_idx on public.tracks (owner_id, created_at desc);
create index if not exists tracks_search_idx on public.tracks (title, artist, album);
create index if not exists playlists_owner_idx on public.playlists (owner_id, created_at desc);
create index if not exists playlist_tracks_playlist_idx on public.playlist_tracks (playlist_id, position);
create index if not exists friendships_participants_idx on public.friendships (requester_id, addressee_id, status);
create index if not exists listening_activity_updated_idx on public.listening_activity (updated_at desc);

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.friendships enable row level security;
alter table public.listening_activity enable row level security;
alter table public.user_mods enable row level security;

-- Profiles are public (needed to show who owns a playlist and to find friends).
drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Tracks are readable by everyone so they can be searched and public playlists can be played.
drop policy if exists "tracks are viewable by everyone" on public.tracks;
create policy "tracks are viewable by everyone" on public.tracks for select using (true);
drop policy if exists "users insert own tracks" on public.tracks;
create policy "users insert own tracks" on public.tracks for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "users update own tracks" on public.tracks;
create policy "users update own tracks" on public.tracks for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "users delete own tracks" on public.tracks;
create policy "users delete own tracks" on public.tracks for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "public playlists are viewable" on public.playlists;
create policy "public playlists are viewable" on public.playlists
  for select using (is_public or (select auth.uid()) = owner_id);
drop policy if exists "users insert own playlists" on public.playlists;
create policy "users insert own playlists" on public.playlists for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "users update own playlists" on public.playlists;
create policy "users update own playlists" on public.playlists for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "users delete own playlists" on public.playlists;
create policy "users delete own playlists" on public.playlists for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "playlist tracks follow playlist visibility" on public.playlist_tracks;
create policy "playlist tracks follow playlist visibility" on public.playlist_tracks
  for select using (
    exists (select 1 from public.playlists p where p.id = playlist_id and (p.is_public or p.owner_id = (select auth.uid())))
  );
drop policy if exists "users modify own playlist tracks" on public.playlist_tracks;
create policy "users modify own playlist tracks" on public.playlist_tracks for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));

drop policy if exists "participants can view friendships" on public.friendships;
create policy "participants can view friendships" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
drop policy if exists "users can send friendship requests" on public.friendships;
create policy "users can send friendship requests" on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');
drop policy if exists "recipients can accept friendship requests" on public.friendships;
create policy "recipients can accept friendship requests" on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');
drop policy if exists "participants can remove friendships" on public.friendships;
create policy "participants can remove friendships" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists "users manage own listening activity" on public.listening_activity;
create policy "users manage own listening activity" on public.listening_activity for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "friends can view shared listening activity" on public.listening_activity;
create policy "friends can view shared listening activity" on public.listening_activity for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      is_sharing and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = (select auth.uid()) and f.addressee_id = listening_activity.user_id)
            or (f.addressee_id = (select auth.uid()) and f.requester_id = listening_activity.user_id))
      )
    )
  );

drop policy if exists "users manage own mod installations" on public.user_mods;
create policy "users manage own mod installations" on public.user_mods for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Public bucket so any listener can stream shared tracks; writes stay owner-scoped.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;
drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "users upload to own media folder" on storage.objects;
create policy "users upload to own media folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select auth.uid())::text = (storage.foldername(name))[1]);
drop policy if exists "users delete own media" on storage.objects;
create policy "users delete own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select auth.uid())::text = (storage.foldername(name))[1]);


-- New public-schema tables need explicit Data API access on projects with automatic
-- API exposure disabled. RLS policies above remain the authorization boundary.
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.listening_activity to authenticated;
grant select, insert, update, delete on public.user_mods to authenticated;


-- Optional user-authored lyrics (plain text or timestamped LRC) for uploaded tracks.
create table if not exists public.track_lyrics (
  track_id uuid primary key references public.tracks (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) <= 50000),
  updated_at timestamptz not null default now()
);
alter table public.track_lyrics enable row level security;
drop policy if exists "lyrics are viewable by everyone" on public.track_lyrics;
create policy "lyrics are viewable by everyone" on public.track_lyrics for select using (true);
drop policy if exists "owners manage track lyrics" on public.track_lyrics;
create policy "owners manage track lyrics" on public.track_lyrics for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.tracks t where t.id = track_id and t.owner_id = (select auth.uid()))
  );
grant select, insert, update, delete on public.track_lyrics to authenticated;
