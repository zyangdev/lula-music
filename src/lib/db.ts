/**
 * Repository layer over local SQLite (tauri-plugin-sql).
 *
 * All persistence goes through here so a future cloud-sync backend can be
 * swapped in behind the same function signatures without touching the UI.
 */
import Database from "@tauri-apps/plugin-sql";
import type { Song } from "../types";

export interface Playlist {
  id: number;
  name: string;
  created_at: number;
  count: number;
}

let dbPromise: Promise<Database> | null = null;
function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = Database.load("sqlite:lula.db");
  return dbPromise;
}

/** Insert or refresh a song's cached metadata. Required before referencing it. */
export async function upsertSong(song: Song): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO songs (id, title, artist, album, thumbnail, duration)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, artist = excluded.artist,
       album = excluded.album, thumbnail = excluded.thumbnail,
       duration = excluded.duration`,
    [song.id, song.title, song.artist, song.album ?? null, song.thumbnail ?? null, song.duration ?? null]
  );
}

// ---------- Likes ----------

export async function getLikedIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ song_id: string }[]>("SELECT song_id FROM likes");
  return rows.map((r) => r.song_id);
}

export async function getLikedSongs(): Promise<Song[]> {
  const db = await getDb();
  return db.select<Song[]>(
    `SELECT s.* FROM songs s JOIN likes l ON l.song_id = s.id ORDER BY l.liked_at DESC`
  );
}

/** Toggle like; returns the new liked state. */
export async function toggleLike(song: Song): Promise<boolean> {
  const db = await getDb();
  await upsertSong(song);
  const existing = await db.select<{ song_id: string }[]>(
    "SELECT song_id FROM likes WHERE song_id = $1",
    [song.id]
  );
  if (existing.length > 0) {
    await db.execute("DELETE FROM likes WHERE song_id = $1", [song.id]);
    return false;
  }
  await db.execute("INSERT INTO likes (song_id, liked_at) VALUES ($1, $2)", [song.id, Date.now()]);
  return true;
}

// ---------- Playlists ----------

export async function listPlaylists(): Promise<Playlist[]> {
  const db = await getDb();
  return db.select<Playlist[]>(
    `SELECT p.id, p.name, p.created_at,
            (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS count
     FROM playlists p ORDER BY p.created_at DESC`
  );
}

export async function createPlaylist(name: string): Promise<number> {
  const db = await getDb();
  const res = await db.execute("INSERT INTO playlists (name, created_at) VALUES ($1, $2)", [
    name,
    Date.now(),
  ]);
  return res.lastInsertId as number;
}

export async function renamePlaylist(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE playlists SET name = $1 WHERE id = $2", [name, id]);
}

export async function deletePlaylist(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM playlists WHERE id = $1", [id]);
}

export async function getPlaylistSongs(id: number): Promise<Song[]> {
  const db = await getDb();
  return db.select<Song[]>(
    `SELECT s.* FROM songs s
     JOIN playlist_songs ps ON ps.song_id = s.id
     WHERE ps.playlist_id = $1 ORDER BY ps.position ASC`,
    [id]
  );
}

/** Add a song to a playlist (no-op if already present). */
export async function addToPlaylist(playlistId: number, song: Song): Promise<void> {
  const db = await getDb();
  await upsertSong(song);
  const max = await db.select<{ m: number | null }[]>(
    "SELECT MAX(position) AS m FROM playlist_songs WHERE playlist_id = $1",
    [playlistId]
  );
  const position = (max[0]?.m ?? -1) + 1;
  await db.execute(
    `INSERT INTO playlist_songs (playlist_id, song_id, position, added_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(playlist_id, song_id) DO NOTHING`,
    [playlistId, song.id, position, Date.now()]
  );
}

export async function removeFromPlaylist(playlistId: number, songId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2", [
    playlistId,
    songId,
  ]);
}

/** Persist a new ordering for a playlist; positions become 0..n-1 in array order. */
export async function reorderPlaylist(playlistId: number, orderedSongIds: string[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedSongIds.length; i++) {
    await db.execute(
      "UPDATE playlist_songs SET position = $1 WHERE playlist_id = $2 AND song_id = $3",
      [i, playlistId, orderedSongIds[i]]
    );
  }
}

// ---------- Export / Import ----------

const EXPORT_FORMAT = "lula-playlist";
const EXPORT_VERSION = 1;

interface PlaylistExport {
  name: string;
  songs: Song[];
}

interface ExportFile {
  format: string;
  version: number;
  exported_at: number;
  playlists: PlaylistExport[];
}

/** Serialize one or more playlists (with their songs) to a JSON string. */
export async function exportPlaylists(ids: number[]): Promise<string> {
  const all = await listPlaylists();
  const playlists: PlaylistExport[] = [];
  for (const id of ids) {
    const meta = all.find((p) => p.id === id);
    if (!meta) continue;
    const songs = await getPlaylistSongs(id);
    playlists.push({ name: meta.name, songs });
  }
  const file: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: Date.now(),
    playlists,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Import playlists from a JSON string produced by {@link exportPlaylists}.
 * Each playlist is created anew (duplicate names allowed). Returns the number
 * of playlists imported.
 */
export async function importPlaylists(json: string): Promise<number> {
  let file: ExportFile;
  try {
    file = JSON.parse(json);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (file?.format !== EXPORT_FORMAT || !Array.isArray(file.playlists)) {
    throw new Error("El archivo no es una exportación de playlists de Lula.");
  }
  if (file.version > EXPORT_VERSION) {
    throw new Error("El archivo es de una versión más nueva de Lula.");
  }

  let imported = 0;
  for (const pl of file.playlists) {
    if (!pl || typeof pl.name !== "string" || !Array.isArray(pl.songs)) continue;
    const playlistId = await createPlaylist(pl.name || "Playlist importada");
    for (const song of pl.songs) {
      if (!song || typeof song.id !== "string") continue;
      await addToPlaylist(playlistId, song);
    }
    imported++;
  }
  return imported;
}

// ---------- Trims (start/end clip per song) ----------

export interface Trim {
  /** Seconds into the track where playback should start. */
  start: number;
  /** Seconds where playback should stop, or null for the natural end. */
  end: number | null;
}

export async function getTrims(): Promise<Record<string, Trim>> {
  const db = await getDb();
  const rows = await db.select<{ song_id: string; start_sec: number; end_sec: number | null }[]>(
    "SELECT song_id, start_sec, end_sec FROM song_trims"
  );
  return Object.fromEntries(rows.map((r) => [r.song_id, { start: r.start_sec, end: r.end_sec }]));
}

export async function setTrim(song: Song, start: number, end: number | null): Promise<void> {
  const db = await getDb();
  await upsertSong(song);
  await db.execute(
    `INSERT INTO song_trims (song_id, start_sec, end_sec) VALUES ($1, $2, $3)
     ON CONFLICT(song_id) DO UPDATE SET start_sec = excluded.start_sec, end_sec = excluded.end_sec`,
    [song.id, start, end]
  );
}

export async function clearTrim(songId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM song_trims WHERE song_id = $1", [songId]);
}

// ---------- History ----------

export async function addHistory(song: Song): Promise<void> {
  const db = await getDb();
  await upsertSong(song);
  await db.execute("INSERT INTO history (song_id, played_at) VALUES ($1, $2)", [song.id, Date.now()]);
}

export async function getHistory(limit = 50): Promise<Song[]> {
  const db = await getDb();
  return db.select<Song[]>(
    `SELECT s.* FROM history h JOIN songs s ON s.id = h.song_id
     GROUP BY s.id ORDER BY MAX(h.played_at) DESC LIMIT $1`,
    [limit]
  );
}

// ---------- Downloads ----------

export async function getDownloadMap(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select<{ song_id: string; path: string }[]>(
    "SELECT song_id, path FROM downloads"
  );
  return Object.fromEntries(rows.map((r) => [r.song_id, r.path]));
}

export async function setDownloaded(song: Song, path: string): Promise<void> {
  const db = await getDb();
  await upsertSong(song);
  await db.execute(
    `INSERT INTO downloads (song_id, path, downloaded_at) VALUES ($1, $2, $3)
     ON CONFLICT(song_id) DO UPDATE SET path = excluded.path, downloaded_at = excluded.downloaded_at`,
    [song.id, path, Date.now()]
  );
}

export async function getDownloadedSongs(): Promise<Song[]> {
  const db = await getDb();
  return db.select<Song[]>(
    `SELECT s.* FROM songs s JOIN downloads d ON d.song_id = s.id ORDER BY d.downloaded_at DESC`
  );
}

// ---------- Settings ----------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string | null }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
