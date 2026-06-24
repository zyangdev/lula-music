import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Song } from "../types";
import * as db from "../lib/db";
import type { Playlist } from "../lib/db";
import { saveTextFile, openTextFile } from "../lib/api";

interface LibraryState {
  ready: boolean;
  likedIds: Set<string>;
  playlists: Playlist[];
  downloadMap: Record<string, string>;
  downloadingIds: Set<string>;

  init: () => Promise<void>;
  isLiked: (id: string) => boolean;
  toggleLike: (song: Song) => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  createPlaylist: (name: string) => Promise<number>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  addToPlaylist: (playlistId: number, song: Song) => Promise<void>;
  removeFromPlaylist: (playlistId: number, songId: string) => Promise<void>;
  reorderPlaylist: (playlistId: number, orderedSongIds: string[]) => Promise<void>;
  exportPlaylist: (id: number) => Promise<string | null>;
  exportAllPlaylists: () => Promise<string | null>;
  importPlaylists: () => Promise<number | null>;
  mergeImportIntoPlaylist: (playlistId: number) => Promise<number | null>;
  download: (song: Song) => Promise<void>;
}

/** Strip characters that are invalid in filenames across platforms. */
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "playlist";
}

export const useLibrary = create<LibraryState>((set, get) => ({
  ready: false,
  likedIds: new Set(),
  playlists: [],
  downloadMap: {},
  downloadingIds: new Set(),

  init: async () => {
    const [likedIds, playlists, downloadMap] = await Promise.all([
      db.getLikedIds(),
      db.listPlaylists(),
      db.getDownloadMap(),
    ]);
    set({ ready: true, likedIds: new Set(likedIds), playlists, downloadMap });
  },

  isLiked: (id) => get().likedIds.has(id),

  toggleLike: async (song) => {
    const liked = await db.toggleLike(song);
    const next = new Set(get().likedIds);
    if (liked) next.add(song.id);
    else next.delete(song.id);
    set({ likedIds: next });
  },

  refreshPlaylists: async () => set({ playlists: await db.listPlaylists() }),

  createPlaylist: async (name) => {
    const id = await db.createPlaylist(name.trim() || "Nueva playlist");
    await get().refreshPlaylists();
    return id;
  },

  renamePlaylist: async (id, name) => {
    await db.renamePlaylist(id, name.trim() || "Playlist");
    await get().refreshPlaylists();
  },

  deletePlaylist: async (id) => {
    await db.deletePlaylist(id);
    await get().refreshPlaylists();
  },

  addToPlaylist: async (playlistId, song) => {
    await db.addToPlaylist(playlistId, song);
    await get().refreshPlaylists();
  },

  removeFromPlaylist: async (playlistId, songId) => {
    await db.removeFromPlaylist(playlistId, songId);
    await get().refreshPlaylists();
  },

  reorderPlaylist: async (playlistId, orderedSongIds) => {
    await db.reorderPlaylist(playlistId, orderedSongIds);
  },

  exportPlaylist: async (id) => {
    const meta = get().playlists.find((p) => p.id === id);
    const json = await db.exportPlaylists([id]);
    return saveTextFile(json, `${safeFileName(meta?.name ?? "playlist")}.lula.json`);
  },

  exportAllPlaylists: async () => {
    const ids = get().playlists.map((p) => p.id);
    if (ids.length === 0) return null;
    const json = await db.exportPlaylists(ids);
    return saveTextFile(json, "playlists-lula.lula.json");
  },

  importPlaylists: async () => {
    const json = await openTextFile();
    if (json == null) return null;
    const count = await db.importPlaylists(json);
    await get().refreshPlaylists();
    return count;
  },

  mergeImportIntoPlaylist: async (playlistId) => {
    const json = await openTextFile();
    if (json == null) return null;
    const songs = await db.importMergeIntoPlaylist(playlistId, json);
    await get().refreshPlaylists();
    return songs;
  },

  download: async (song) => {
    if (get().downloadMap[song.id] || get().downloadingIds.has(song.id)) return;
    set({ downloadingIds: new Set(get().downloadingIds).add(song.id) });
    try {
      const path = await invoke<string>("download_song", { videoId: song.id });
      await db.setDownloaded(song, path);
      set((s) => ({ downloadMap: { ...s.downloadMap, [song.id]: path } }));
    } finally {
      const ids = new Set(get().downloadingIds);
      ids.delete(song.id);
      set({ downloadingIds: ids });
    }
  },
}));
