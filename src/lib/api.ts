import { invoke } from "@tauri-apps/api/core";
import type { Song } from "../types";

/** Search music on YouTube (via the Rust/yt-dlp backend). */
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
