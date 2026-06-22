/**
 * Synced lyrics via LRCLIB (https://lrclib.net) — free, no API key.
 * Returns parsed timestamped lines, or plain lyrics, or null.
 */
import type { Song } from "../types";

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface Lyrics {
  synced: LyricLine[] | null;
  plain: string | null;
}

interface LrclibResponse {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

/** Strip "(Official Video)" / "[Audio]" noise so LRCLIB matches better. */
function cleanTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(official|video|audio|lyrics?|visualizer|hd|4k)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const matches = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (matches.length === 0) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of matches) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const frac = m[3] ? Number(`0.${m[3]}`) : 0;
      lines.push({ time: min * 60 + sec + frac, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(song: Song): Promise<Lyrics> {
  const title = cleanTitle(song.title);
  const params = new URLSearchParams({
    track_name: title,
    artist_name: song.artist,
  });
  if (song.duration) params.set("duration", String(Math.round(song.duration)));

  const tryFetch = async (url: string): Promise<Lyrics | null> => {
    const res = await fetch(url, { headers: { "User-Agent": "Lula (music player)" } });
    if (!res.ok) return null;
    const data = (await res.json()) as LrclibResponse | LrclibResponse[];
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return null;
    return {
      synced: item.syncedLyrics ? parseLrc(item.syncedLyrics) : null,
      plain: item.plainLyrics ?? null,
    };
  };

  try {
    const exact = await tryFetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (exact && (exact.synced || exact.plain)) return exact;
  } catch {
    /* fall through to search */
  }

  try {
    const search = new URLSearchParams({ track_name: title, artist_name: song.artist });
    const found = await tryFetch(`https://lrclib.net/api/search?${search.toString()}`);
    if (found) return found;
  } catch {
    /* ignore */
  }

  return { synced: null, plain: null };
}
