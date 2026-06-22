import { useState } from "react";
import {
  Play,
  Pause,
  Music2,
  Volume2,
  Heart,
  Plus,
  Download,
  Check,
  CircleCheck,
  Loader2,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { Song } from "../types";
import { usePlayer } from "../store/playerStore";
import { useLibrary } from "../store/libraryStore";
import { useUi } from "../store/uiStore";
import { openContextMenu } from "../store/contextMenuStore";
import { buildSongMenu } from "../lib/menus";
import { formatTime } from "../lib/format";

function AddToPlaylistButton({ song }: { song: Song }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState("");
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const createPlaylist = useLibrary((s) => s.createPlaylist);

  async function handleCreate() {
    const name = creating.trim();
    if (!name) return;
    const id = await createPlaylist(name);
    await addToPlaylist(id, song);
    setCreating("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-muted hover:text-text"
        title="Agregar a playlist"
      >
        <Plus size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-surface-2 p-1 shadow-xl">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted">Agregar a…</div>
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={async () => {
                  await addToPlaylist(p.id, song);
                  setOpen(false);
                }}
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
              >
                {p.name}
              </button>
            ))}
            <div className="mt-1 flex items-center gap-1 border-t border-border px-1 pt-1">
              <input
                value={creating}
                onChange={(e) => setCreating(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Nueva playlist…"
                className="min-w-0 flex-1 rounded-md bg-surface px-2 py-1.5 text-sm outline-none placeholder:text-muted"
              />
              <button
                onClick={handleCreate}
                className="shrink-0 rounded-md bg-accent px-2 py-1.5 text-white hover:bg-accent-hover"
                title="Crear y agregar"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SongList({
  songs,
  onRemove,
  onReorder,
}: {
  songs: Song[];
  /** When provided, shows a remove button per row (e.g. inside a playlist). */
  onRemove?: (song: Song) => void;
  /** When provided, rows can be dragged to reorder the list (e.g. a playlist). */
  onReorder?: (from: number, to: number) => void;
}) {
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentId = usePlayer((s) => s.current()?.id);

  const likedIds = useLibrary((s) => s.likedIds);
  const toggleLike = useLibrary((s) => s.toggleLike);
  const downloadMap = useLibrary((s) => s.downloadMap);
  const downloadingIds = useLibrary((s) => s.downloadingIds);
  const download = useLibrary((s) => s.download);

  const setDraggingSong = useUi((s) => s.setDraggingSong);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
    setDraggingSong(null);
  }

  return (
    <ul className="flex flex-col">
      {songs.map((song, i) => {
        const isCurrent = currentId === song.id;
        const liked = likedIds.has(song.id);
        const downloaded = !!downloadMap[song.id];
        const downloading = downloadingIds.has(song.id);
        return (
          <li
            key={`${song.id}-${i}`}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              setDraggingSong(song);
              // copyMove so reorderable lists can also drop onto a playlist.
              e.dataTransfer.effectAllowed = onReorder ? "copyMove" : "copy";
              e.dataTransfer.setData("text/plain", song.id);
            }}
            onDragEnd={endDrag}
            onDragOver={
              onReorder
                ? (e) => {
                    e.preventDefault();
                    if (overIndex !== i) setOverIndex(i);
                  }
                : undefined
            }
            onDrop={
              onReorder
                ? (e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
                    endDrag();
                  }
                : undefined
            }
            onDoubleClick={() => playQueue(songs, i)}
            onContextMenu={(e) =>
              openContextMenu(
                e,
                buildSongMenu(song, {
                  onRemoveFromPlaylist: onRemove ? () => onRemove(song) : undefined,
                })
              )
            }
            className={clsx(
              "group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2",
              isCurrent && "bg-surface-2",
              dragIndex === i && "opacity-40",
              onReorder && overIndex === i && dragIndex !== i && "bg-surface-2 ring-1 ring-accent"
            )}
          >
            <button
              onClick={() => (isCurrent ? toggle() : playQueue(songs, i))}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2"
              title="Reproducir"
            >
              {song.thumbnail ? (
                <img
                  src={song.thumbnail}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music2 size={18} className="text-muted" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {isCurrent && isPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="ml-0.5 text-white" />
                )}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className={clsx("truncate text-sm font-medium", isCurrent && "text-accent")}>
                {song.title}
              </div>
              <div className="truncate text-xs text-muted">{song.artist}</div>
            </div>

            {isCurrent && isPlaying && <Volume2 size={16} className="shrink-0 text-accent" />}

            {/* Persistent "downloaded / available offline" mark (fades on hover
                so the action buttons can take its place). */}
            {downloaded && (
              <CircleCheck
                size={16}
                className="shrink-0 text-green-400 transition-opacity group-hover:opacity-0"
                aria-label="Descargada"
              />
            )}

            <div className="flex shrink-0 items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={() => toggleLike(song)}
                className={clsx(liked ? "text-accent" : "text-muted hover:text-text")}
                title={liked ? "Quitar de Me gusta" : "Me gusta"}
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
              </button>

              <AddToPlaylistButton song={song} />

              <button
                onClick={() => download(song)}
                disabled={downloaded || downloading}
                className={clsx(downloaded ? "text-green-400" : "text-muted hover:text-text")}
                title={downloaded ? "Descargada" : downloading ? "Descargando…" : "Descargar"}
              >
                {downloading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : downloaded ? (
                  <Check size={18} />
                ) : (
                  <Download size={18} />
                )}
              </button>

              {onRemove && (
                <button
                  onClick={() => onRemove(song)}
                  className="text-muted hover:text-red-400"
                  title="Quitar"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
              {song.duration ? formatTime(song.duration) : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
