import { useState, type ReactNode } from "react";
import { Play, Loader2, Download } from "lucide-react";
import clsx from "clsx";
import type { Song } from "../types";
import SongList from "./SongList";
import { usePlayer } from "../store/playerStore";
import { useLibrary } from "../store/libraryStore";
import { useUi } from "../store/uiStore";

export default function SongsScreen({
  title,
  subtitle,
  icon,
  songs,
  loading,
  emptyText,
  onRemove,
  onReorder,
  onDropSong,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  songs: Song[];
  loading: boolean;
  emptyText: string;
  onRemove?: (song: Song) => void;
  onReorder?: (from: number, to: number) => void;
  /** When set, dragging a song onto the list area calls this (e.g. add to playlist). */
  onDropSong?: (song: Song) => void;
  headerExtra?: ReactNode;
}) {
  const playQueue = usePlayer((s) => s.playQueue);
  const downloadMap = useLibrary((s) => s.downloadMap);
  const downloadingIds = useLibrary((s) => s.downloadingIds);
  const download = useLibrary((s) => s.download);
  const draggingSong = useUi((s) => s.draggingSong);
  const [dropActive, setDropActive] = useState(false);

  const pending = songs.filter((s) => !downloadMap[s.id]);
  const downloadingFromList = songs.some((s) => downloadingIds.has(s.id));

  async function downloadAll() {
    // Sequential so we don't spawn many yt-dlp processes at once.
    for (const s of pending) await download(s);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 p-4 pb-4 sm:gap-4 sm:p-6">
        {icon}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {songs.length > 0 && (
          <button
            onClick={() => playQueue(songs, 0)}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-hover"
          >
            <Play size={18} fill="currentColor" /> Reproducir
          </button>
        )}
        {pending.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloadingFromList}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-muted hover:border-accent hover:text-text disabled:opacity-60"
            title="Descargar todas las canciones de la lista"
          >
            {downloadingFromList ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {downloadingFromList ? "Descargando…" : `Descargar todo (${pending.length})`}
          </button>
        )}
        {headerExtra}
      </div>

      <div
        onDragOver={
          onDropSong
            ? (e) => {
                if (!draggingSong) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                if (!dropActive) setDropActive(true);
              }
            : undefined
        }
        onDragLeave={
          onDropSong
            ? (e) => {
                // Only clear when leaving the container itself, not its children.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
              }
            : undefined
        }
        onDrop={
          onDropSong
            ? (e) => {
                e.preventDefault();
                if (draggingSong) onDropSong(draggingSong);
                setDropActive(false);
              }
            : undefined
        }
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto px-4 pb-6",
          onDropSong &&
            draggingSong &&
            "rounded-xl ring-2 ring-inset ring-border transition-shadow",
          dropActive && "bg-accent/5 ring-accent"
        )}
      >
        {loading ? (
          <div className="flex items-center gap-2 px-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : songs.length > 0 ? (
          <SongList songs={songs} onRemove={onRemove} onReorder={onReorder} />
        ) : (
          <p className="px-2 text-sm text-muted">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
