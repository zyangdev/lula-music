import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Music2,
  Loader2,
  Infinity as InfinityIcon,
  ChevronUp,
  ListMusic,
} from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "../store/playerStore";
import { useUi } from "../store/uiStore";
import { openContextMenu } from "../store/contextMenuStore";
import { buildSongMenu } from "../lib/menus";
import { formatTime } from "../lib/format";
import QueueList from "./QueueList";

export default function PlayerBar() {
  const {
    isPlaying,
    loadingTrack,
    currentTime,
    duration,
    volume,
    muted,
    repeat,
    shuffle,
    autoplay,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
    toggleAutoplay,
  } = usePlayer();
  const song = usePlayer((s) => s.current());
  const queue = usePlayer((s) => s.queue);
  const openNowPlaying = useUi((s) => s.openNowPlaying);
  const setDraggingSong = useUi((s) => s.setDraggingSong);
  const [queueOpen, setQueueOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);

  // Close the queue popover on an outside click. Using a listener instead of a
  // full-screen overlay so it doesn't block drops onto the sidebar while dragging.
  useEffect(() => {
    if (!queueOpen) return;
    const onDown = (e: MouseEvent) => {
      if (queueRef.current && !queueRef.current.contains(e.target as Node)) {
        setQueueOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [queueOpen]);

  return (
    <footer className="flex h-20 shrink-0 items-center gap-4 border-t border-border bg-surface px-4">
      {/* Track info — click to open the full Now Playing view */}
      <button
        onClick={() => song && openNowPlaying()}
        disabled={!song}
        draggable={!!song}
        onDragStart={(e) => {
          if (!song) return;
          setDraggingSong(song);
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.setData("text/plain", song.id);
        }}
        onDragEnd={() => setDraggingSong(null)}
        onContextMenu={(e) => song && openContextMenu(e, buildSongMenu(song))}
        className="group flex w-60 min-w-0 items-center gap-3 text-left disabled:cursor-default"
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
          {song?.thumbnail ? (
            <img src={song.thumbnail} alt="" draggable={false} className="h-full w-full object-cover" />
          ) : (
            <Music2 size={20} className="text-muted" />
          )}
          {song && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ChevronUp size={18} className="text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{song?.title ?? "Nada sonando"}</div>
          <div className="truncate text-xs text-muted">{song?.artist ?? "—"}</div>
        </div>
      </button>

      {/* Controls + seek */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={clsx("transition-colors", shuffle ? "text-accent" : "text-muted hover:text-text")}
            title="Aleatorio"
          >
            <Shuffle size={18} />
          </button>
          <button onClick={prev} className="text-muted hover:text-text" title="Anterior">
            <SkipBack size={20} />
          </button>
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-text text-bg transition-transform hover:scale-105"
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {loadingTrack ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>
          <button onClick={next} className="text-muted hover:text-text" title="Siguiente">
            <SkipForward size={20} />
          </button>
          <button
            onClick={cycleRepeat}
            className={clsx("transition-colors", repeat !== "off" ? "text-accent" : "text-muted hover:text-text")}
            title={`Repetir: ${repeat}`}
          >
            {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        <div className="flex w-full max-w-xl items-center gap-2">
          <span className="w-10 text-right text-xs tabular-nums text-muted">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-accent/25 accent-accent"
          />
          <span className="w-10 text-xs tabular-nums text-muted">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Queue + Autoplay + Volume */}
      <div className="flex w-60 items-center justify-end gap-2">
        <div className="relative" ref={queueRef}>
          <button
            onClick={() => setQueueOpen((o) => !o)}
            className={clsx("transition-colors", queueOpen ? "text-accent" : "text-muted hover:text-text")}
            title="Cola de reproducción"
          >
            <ListMusic size={18} />
          </button>
          {queueOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-3 w-80 rounded-lg border border-border bg-surface-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">Cola</span>
                <span className="text-xs text-muted">{queue.length} en cola</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <QueueList />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={toggleAutoplay}
          className={clsx("transition-colors", autoplay ? "text-accent" : "text-muted hover:text-text")}
          title={autoplay ? "Autoplay activado (radio al terminar)" : "Autoplay desactivado"}
        >
          <InfinityIcon size={18} />
        </button>
        <button onClick={toggleMute} className="text-muted hover:text-text">
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-accent/25 accent-accent"
        />
      </div>
    </footer>
  );
}
