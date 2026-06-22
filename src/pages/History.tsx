import { useEffect, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import type { Song } from "../types";
import { getHistory } from "../lib/db";
import SongsScreen from "../components/SongsScreen";

export default function History() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then(setSongs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <SongsScreen
      title="Historial"
      subtitle={`${songs.length} canciones recientes`}
      icon={
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-sky-600">
          <HistoryIcon size={28} className="text-white" />
        </div>
      }
      songs={songs}
      loading={loading}
      emptyText="Todavía no has reproducido nada."
    />
  );
}
