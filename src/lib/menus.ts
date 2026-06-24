import {
  Play,
  ListPlus,
  Plus,
  ListMusic,
  Heart,
  HeartOff,
  Download,
  Check,
  Radio,
  X,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import type { MenuItem } from "../store/contextMenuStore";
import type { Song } from "../types";
import type { Playlist } from "./db";
import { getPlaylistSongs } from "./db";
import { usePlayer } from "../store/playerStore";
import { useLibrary } from "../store/libraryStore";
import { toast } from "../store/toastStore";

export interface SongMenuContext {
  /** Row lives in the play queue at this index (adds "Quitar de la cola"). */
  queueIndex?: number;
  /** Row lives in a playlist; called to remove it (adds "Quitar de la playlist"). */
  onRemoveFromPlaylist?: () => void;
}

/**
 * Build the right-click menu for a song. Reads a snapshot of library state
 * (liked / downloaded) at open time — the menu is short-lived so that's fine.
 */
export function buildSongMenu(song: Song, ctx: SongMenuContext = {}): MenuItem[] {
  const player = usePlayer.getState();
  const lib = useLibrary.getState();
  const liked = lib.likedIds.has(song.id);
  const downloaded = !!lib.downloadMap[song.id];
  const playlists = lib.playlists;

  const addToPlaylist: MenuItem = {
    label: "Añadir a playlist",
    icon: ListMusic,
    submenu:
      playlists.length > 0
        ? playlists.map((p) => ({
            label: p.name,
            icon: ListMusic,
            onClick: () => void useLibrary.getState().addToPlaylist(p.id, song),
          }))
        : [{ label: "No tienes playlists", disabled: true }],
  };

  const items: MenuItem[] = [
    { label: "Reproducir ahora", icon: Play, onClick: () => player.playNow(song) },
    { label: "Reproducir a continuación", icon: ListPlus, onClick: () => player.playNext(song) },
    { label: "Añadir a la cola", icon: Plus, onClick: () => player.addToQueue(song) },
    addToPlaylist,
    { separator: true },
    liked
      ? { label: "Quitar de Me gusta", icon: HeartOff, onClick: () => void lib.toggleLike(song) }
      : { label: "Me gusta", icon: Heart, onClick: () => void lib.toggleLike(song) },
    downloaded
      ? { label: "Descargada", icon: Check, disabled: true }
      : { label: "Descargar", icon: Download, onClick: () => void lib.download(song) },
    { label: "Iniciar radio", icon: Radio, onClick: () => void player.playRadio(song) },
  ];

  if (ctx.queueIndex !== undefined) {
    items.push(
      { separator: true },
      {
        label: "Quitar de la cola",
        icon: X,
        danger: true,
        onClick: () => player.removeFromQueue(ctx.queueIndex!),
      }
    );
  }
  if (ctx.onRemoveFromPlaylist) {
    items.push(
      { separator: true },
      {
        label: "Quitar de la playlist",
        icon: X,
        danger: true,
        onClick: ctx.onRemoveFromPlaylist,
      }
    );
  }

  return items;
}

/** Build the right-click menu for a playlist. */
export function buildPlaylistMenu(
  playlist: Playlist,
  ctx: { onRename: () => void }
): MenuItem[] {
  return [
    {
      label: "Reproducir",
      icon: Play,
      onClick: async () => {
        const songs = await getPlaylistSongs(playlist.id);
        usePlayer.getState().playQueue(songs);
      },
    },
    { label: "Renombrar", icon: Pencil, onClick: ctx.onRename },
    {
      label: "Exportar",
      icon: Upload,
      onClick: async () => {
        try {
          const path = await useLibrary.getState().exportPlaylist(playlist.id);
          if (path) toast.success(`Playlist «${playlist.name}» exportada.`);
        } catch (e) {
          toast.error(`No se pudo exportar: ${e}`);
        }
      },
    },
    {
      label: "Importar y fusionar…",
      icon: Download,
      onClick: async () => {
        try {
          const n = await useLibrary.getState().mergeImportIntoPlaylist(playlist.id);
          if (n != null) toast.success(`${n} canción(es) fusionada(s) en «${playlist.name}».`);
        } catch (e) {
          toast.error(`No se pudo importar: ${e}`);
        }
      },
    },
    { separator: true },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      onClick: () => void useLibrary.getState().deletePlaylist(playlist.id),
    },
  ];
}
