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

create index if not exists tracks_owner_idx on public.tracks (owner_id, created_at desc);
create index if not exists playlists_owner_idx on public.playlists (owner_id, created_at desc);
create index if not exists playlist_tracks_playlist_idx on public.playlist_tracks (playlist_id, position);

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

-- Profiles are public (needed to show who owns a playlist).
drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone" on public.profiles for select using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Tracks are readable by everyone so shared playlists can be played.
drop policy if exists "tracks are viewable by everyone" on public.tracks;
create policy "tracks are viewable by everyone" on public.tracks for select using (true);

drop policy if exists "users insert own tracks" on public.tracks;
create policy "users insert own tracks" on public.tracks for insert with check (auth.uid() = owner_id);

drop policy if exists "users update own tracks" on public.tracks;
create policy "users update own tracks" on public.tracks for update using (auth.uid() = owner_id);

drop policy if exists "users delete own tracks" on public.tracks;
create policy "users delete own tracks" on public.tracks for delete using (auth.uid() = owner_id);

drop policy if exists "public playlists are viewable" on public.playlists;
create policy "public playlists are viewable" on public.playlists
  for select using (is_public or auth.uid() = owner_id);

drop policy if exists "users insert own playlists" on public.playlists;
create policy "users insert own playlists" on public.playlists
  for insert with check (auth.uid() = owner_id);

drop policy if exists "users update own playlists" on public.playlists;
create policy "users update own playlists" on public.playlists
  for update using (auth.uid() = owner_id);

drop policy if exists "users delete own playlists" on public.playlists;
create policy "users delete own playlists" on public.playlists
  for delete using (auth.uid() = owner_id);

drop policy if exists "playlist tracks follow playlist visibility" on public.playlist_tracks;
create policy "playlist tracks follow playlist visibility" on public.playlist_tracks
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.is_public or p.owner_id = auth.uid())
    )
  );

drop policy if exists "users modify own playlist tracks" on public.playlist_tracks;
create policy "users modify own playlist tracks" on public.playlist_tracks
  for all using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  );

-- Public bucket so any listener can stream shared tracks; writes stay owner-scoped
-- because every object lives under a folder named after the uploader's user id.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "users upload to own media folder" on storage.objects;
create policy "users upload to own media folder" on storage.objects
  for insert with check (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own media" on storage.objects;
create policy "users delete own media" on storage.objects
  for delete using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );
