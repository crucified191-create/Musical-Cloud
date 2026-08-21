import { parseBlob } from "music-metadata";
import { putTrack, type Track } from "./db";

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name);
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function durationFromBlob(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const value = Number.isFinite(audio.duration) ? audio.duration : 0;
      cleanup();
      resolve(value);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

export async function importFile(file: File): Promise<Track> {
  let title = stripExtension(file.name);
  let artist = "Unknown artist";
  let album = "";
  let duration = 0;
  let cover: Blob | undefined;

  try {
    const metadata = await parseBlob(file, { duration: true });
    const { common, format } = metadata;
    if (common.title) title = common.title;
    if (common.artist) artist = common.artist;
    if (common.album) album = common.album;
    if (format.duration) duration = format.duration;
    const picture = common.picture?.[0];
    if (picture) {
      cover = new Blob([new Uint8Array(picture.data)], { type: picture.format });
    }
  } catch {
    // Unparseable tags are fine — fall back to the file name.
  }

  if (!duration) duration = await durationFromBlob(file);

  const track: Track = {
    id: crypto.randomUUID(),
    title,
    artist,
    album,
    duration,
    fileName: file.name,
    mimeType: file.type || "audio/mpeg",
    size: file.size,
    addedAt: Date.now(),
    data: file,
    cover,
  };

  await putTrack(track);
  return track;
}
