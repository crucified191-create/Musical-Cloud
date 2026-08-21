export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: number;
  data: Blob;
  cover?: Blob;
};

export type TrackMeta = Omit<Track, "data" | "cover"> & { coverUrl?: string };

const DB_NAME = "knockoff-spotify";
const DB_VERSION = 1;
const STORE = "tracks";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("addedAt", "addedAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putTrack(track: Track): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(track);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const tracks = await promisify(tx.objectStore(STORE).getAll() as IDBRequest<Track[]>);
  return tracks.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getTrack(id: string): Promise<Track | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  return promisify(tx.objectStore(STORE).get(id) as IDBRequest<Track | undefined>);
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
