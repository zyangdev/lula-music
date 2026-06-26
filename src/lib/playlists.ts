import type { Song } from "../types";
import { useLibrary } from "../store/libraryStore";
import { promptText } from "../store/promptStore";
import { toast } from "../store/toastStore";

/**
 * Ask for a name and create a playlist. If a song is given, it's added to the
 * new playlist too. Shared by the sidebar, the Library page and context menus.
 */
export async function promptCreatePlaylist(song?: Song): Promise<number | null> {
  const name = await promptText({
    title: song ? "Nueva playlist" : "Crear playlist",
    placeholder: "Nombre de la playlist…",
  });
  if (!name || !name.trim()) return null;

  const lib = useLibrary.getState();
  const id = await lib.createPlaylist(name);
  if (song) {
    await lib.addToPlaylist(id, song);
    toast.success(`Añadida a «${name.trim()}».`);
  } else {
    toast.success(`Playlist «${name.trim()}» creada.`);
  }
  return id;
}
