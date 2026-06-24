import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { Song } from "../types";

/**
 * Ask the user where to save, then write `contents` there.
 * Returns the chosen path, or null if the user cancelled.
 *
 * No file-type filter is set: on Android a `.lula.json` is often reported as
 * octet-stream and a JSON filter would hide it, so we allow any file and the
 * importer validates the format instead.
 */
export async function saveTextFile(
  contents: string,
  defaultName: string
): Promise<string | null> {
  const path = await save({ defaultPath: defaultName });
  if (!path) return null;
  await invoke("write_text_file", { path, contents });
  return path;
}

/**
 * Ask the user to pick a file, then read it as text.
 * Returns the contents, or null if the user cancelled.
 */
export async function openTextFile(): Promise<string | null> {
  const path = await open({ multiple: false, directory: false });
  if (!path || typeof path !== "string") return null;
  return invoke<string>("read_text_file", { path });
}

/** Search music on YouTube (yt-dlp on desktop, NewPipeExtractor on Android). */
export function searchSongs(query: string, limit = 20): Promise<Song[]> {
  return invoke<Song[]>("search_songs", { query, limit });
}

/** Resolve a videoId to a directly-playable audio stream URL. */
export function resolveStream(videoId: string): Promise<string> {
  return invoke<string>("resolve_stream", { videoId });
}

/** Get songs related to a videoId (YouTube radio mix), for autoplay/radio. */
export function getRadio(videoId: string, limit = 25): Promise<Song[]> {
  return invoke<Song[]>("get_radio", { videoId, limit });
}
