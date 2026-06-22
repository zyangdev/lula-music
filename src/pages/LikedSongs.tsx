import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Song } from "../types";
import { getLikedSongs } from "../lib/db";
import { useLibrary } from "../store/libraryStore";
import SongsScreen from "../components/SongsScreen";

export default function LikedSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const likedIds = useLibrary((s) => s.likedIds);

  useEffect(() => {
    getLikedSongs()
      .then(setSongs)
      .finally(() => setLoading(false));
  }, [likedIds]);

  return (
    <SongsScreen
      title="Me gusta"
      subtitle={`${songs.length} canciones`}
      icon={
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent">
          <Heart size={28} className="text-white" fill="currentColor" />
        </div>
      }
      songs={songs}
      loading={loading}
      emptyText="Aún no tienes canciones marcadas con Me gusta."
    />
  );
}
