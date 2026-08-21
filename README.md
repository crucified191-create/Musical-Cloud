# Riff — a knockoff Spotify web player

Drop your own mp3 files in and play them in the browser. No accounts, no server, no uploads:
tracks (and their ID3 tags + cover art) are stored locally in your browser's IndexedDB, so the
app can be deployed anywhere static — including Vercel's free tier.

## Features

- Add music by drag-and-drop or the "Add music" button (mp3, m4a, flac, ogg, wav)
- ID3 tag reading for title / artist / album / cover art, with filename fallback
- Persistent library in IndexedDB — survives reloads
- Player bar with play/pause, next/previous, seek, volume, shuffle, repeat (off/all/one)
- Search across title, artist, album and filename; delete tracks

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

```bash
npm i -g vercel
vercel
```

Any static-friendly host works (Vercel, Netlify, Cloudflare Pages). There is no backend.

## Notes / limits

- The library lives in the browser it was added from — it is not shared between devices or
  browsers. To sync a library across devices, swap the IndexedDB layer in `src/lib/db.ts` for
  object storage (e.g. Vercel Blob or S3) plus a small API route.
- Browser storage quota is typically a few GB per origin; large libraries may hit it.
