import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ListMusic, Trash2 } from "lucide-react";
import type { Song } from "../types";
import { getPlaylistSongs } from "../lib/db";
import { useLibrary } from "../store/libraryStore";
import SongsScreen from "../components/SongsScreen";

export default function PlaylistDetail() {
  const { id } = useParams();
  const playlistId = Number(id);
  const navigate = useNavigate();

  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const removeFromPlaylist = useLibrary((s) => s.removeFromPlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const reorderPlaylist = useLibrary((s) => s.reorderPlaylist);
  const playlist = playlists.find((p) => p.id === playlistId);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(playlistId)) return;
    setLoading(true);
    getPlaylistSongs(playlistId)
      .then(setSongs)
      .finally(() => setLoading(false));
    // Re-run when the playlist's song count changes (add/remove).
  }, [playlistId, playlist?.count]);

  async function handleDelete() {
    await deletePlaylist(playlistId);
    navigate("/library");
  }

  function handleReorder(from: number, to: number) {
    setSongs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void reorderPlaylist(playlistId, next.map((s) => s.id));
      return next;
    });
  }

  return (
    <SongsScreen
      title={playlist?.name ?? "Playlist"}
      subtitle={`${songs.length} canciones`}
      icon={
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-2">
          <ListMusic size={28} className="text-muted" />
        </div>
      }
      songs={songs}
      loading={loading}
      emptyText="Esta playlist está vacía. Agrega canciones desde Buscar."
      onRemove={(song) => removeFromPlaylist(playlistId, song.id)}
      onReorder={handleReorder}
      onDropSong={(song) => void addToPlaylist(playlistId, song)}
      headerExtra={
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-muted hover:border-red-400 hover:text-red-400"
          title="Eliminar playlist"
        >
          <Trash2 size={16} /> Eliminar
        </button>
      }
    />
  );
}
