import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const artist = searchParams.get("artist")?.trim();
  const album = searchParams.get("album")?.trim();
  const duration = searchParams.get("duration")?.trim();

  if (!title || !artist) {
    return NextResponse.json({ error: "A title and artist are required." }, { status: 400 });
  }

  const lrclibUrl = new URL("https://lrclib.net/api/get");
  lrclibUrl.searchParams.set("track_name", title);
  lrclibUrl.searchParams.set("artist_name", artist);
  if (album) lrclibUrl.searchParams.set("album_name", album);
  if (duration) lrclibUrl.searchParams.set("duration", duration);

  try {
    const response = await fetch(lrclibUrl, {
      headers: { Accept: "application/json", "User-Agent": "Riff lyrics lookup" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) {
      const lyrics = await response.json() as { syncedLyrics?: string | null; plainLyrics?: string | null };
      const content = lyrics.syncedLyrics || lyrics.plainLyrics;
      if (content) return NextResponse.json({ content, source: "LRCLIB", synced: Boolean(lyrics.syncedLyrics) });
    }
  } catch { /* Fall through to Lyrics.ovh. */ }

  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) {
      const lyrics = await response.json() as { lyrics?: string };
      if (lyrics.lyrics) return NextResponse.json({ content: lyrics.lyrics, source: "Lyrics.ovh", synced: false });
    }
  } catch { /* Neither free provider returned lyrics. */ }

  return NextResponse.json({ error: "Lyrics not found." }, { status: 404 });
}
