# Riff — a knockoff Spotify web player

Upload your own mp3s, organize them into playlists, and share those playlists publicly so
anyone can listen. Next.js + Supabase (auth, Postgres, storage); deploys to Vercel.

## Features

- Email/password sign up, sign in, log out, plus Google sign-in
- Upload mp3/m4a/flac/ogg/wav; ID3 tags (title/artist/album/cover art) read in the browser
- Playlists, each toggleable between public and private
- Browse page listing every public playlist with its owner — playable without an account
- Player bar: play/pause, next/previous, seek, volume, shuffle, repeat (off/all/one)

## Setup

1. Create a free project at https://supabase.com.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables,
   row-level-security policies, the `media` storage bucket, and a trigger that creates a
   profile row for each new user.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from
   Project Settings → API.
4. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Optional: in Supabase → Authentication → Providers → Email, turn off "Confirm email" if you
want sign-ups to be usable immediately without an inbox round-trip.

## Google sign-in

The login page asks Supabase which providers are enabled and only starts an OAuth flow for
those; the button explains what to switch on otherwise. Google redirects back to
`/auth/callback`, which exchanges the code for a session. Adding another provider is a matter
of enabling it in Supabase and appending an entry to `PROVIDERS` in `src/app/login/page.tsx`.

1. Supabase → Authentication → Providers → Google → enable, then paste the client ID and
   secret. Copy the callback URL Supabase shows you.
2. Create an OAuth client (type "Web application") at
   https://console.cloud.google.com/apis/credentials, configure the consent screen, and add
   that Supabase callback URL as an authorized redirect URI.
3. Supabase → Authentication → URL Configuration: set Site URL to your deployed origin and add
   `http://localhost:3000` under Redirect URLs so local sign-in works too.

## Deploy

Push to GitHub and import the repo on Vercel, setting `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. No other backend is needed.

## How sharing works

Audio lives in the public `media` bucket under `<user-id>/<track-id>.<ext>`; storage policies
only allow writes and deletes inside your own folder. Playlist rows are readable by everyone
when `is_public` is true, so public playlists stream for signed-out visitors too.
