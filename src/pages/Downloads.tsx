import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { Song } from "../types";
import { getDownloadedSongs } from "../lib/db";
import { useLibrary } from "../store/libraryStore";
import SongsScreen from "../components/SongsScreen";

export default function Downloads() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const downloadMap = useLibrary((s) => s.downloadMap);

  useEffect(() => {
    getDownloadedSongs()
      .then(setSongs)
      .finally(() => setLoading(false));
  }, [downloadMap]);

  return (
    <SongsScreen
      title="Descargas"
      subtitle={`${songs.length} canciones disponibles offline`}
      icon={
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-600">
          <Download size={28} className="text-white" />
        </div>
      }
      songs={songs}
      loading={loading}
      emptyText="No has descargado canciones. Usa el ícono de descarga en cualquier canción."
    />
  );
}
