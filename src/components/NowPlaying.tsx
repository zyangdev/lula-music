import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music2,
  Loader2,
  Radio,
  Heart,
} from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "../store/playerStore";
import { useLibrary } from "../store/libraryStore";
import { useUi } from "../store/uiStore";
import { fetchLyrics, type Lyrics } from "../lib/lyrics";
import { formatTime } from "../lib/format";
import SleepTimer from "./SleepTimer";
import QueueList from "./QueueList";

function LyricsPanel() {
  const song = usePlayer((s) => s.current());
  const currentTime = usePlayer((s) => s.currentTime);
  const seek = usePlayer((s) => s.seek);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const activeRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!song) return;
    setLoading(true);
    setLyrics(null);
    let cancelled = false;
    fetchLyrics(song)
      .then((l) => !cancelled && setLyrics(l))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [song?.id]);

  const synced = lyrics?.synced ?? null;
  const activeIdx = synced
    ? synced.reduce((acc, l, i) => (l.time <= currentTime + 0.2 ? i : acc), -1)
    : -1;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted">
        <Loader2 className="animate-spin" size={18} /> Buscando letra…
      </div>
    );
  }
  if (synced && synced.length > 0) {
    return (
      <div className="h-full overflow-y-auto px-2 py-6">
        {synced.map((line, i) => (
          <p
            key={i}
            ref={i === activeIdx ? activeRef : null}
            onClick={() => seek(line.time)}
            className={clsx(
              "cursor-pointer py-2 text-center text-xl font-semibold transition-colors",
              i === activeIdx ? "text-text" : "text-muted/50 hover:text-muted"
            )}
          >
            {line.text || "♪"}
          </p>
        ))}
      </div>
    );
  }
  if (lyrics?.plain) {
    return (
      <div className="h-full overflow-y-auto whitespace-pre-line px-2 py-6 text-center text-base text-muted">
        {lyrics.plain}
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center text-center text-muted">
      No se encontró letra para esta canción.
    </div>
  );
}

export default function NowPlaying() {
  const open = useUi((s) => s.nowPlayingOpen);
  const close = useUi((s) => s.closeNowPlaying);

  const song = usePlayer((s) => s.current());
  const isPlaying = usePlayer((s) => s.isPlaying);
  const loadingTrack = usePlayer((s) => s.loadingTrack);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const queue = usePlayer((s) => s.queue);
  const radioLoading = usePlayer((s) => s.radioLoading);
  const { toggle, next, prev, seek, playRadio } = usePlayer();

  const likedIds = useLibrary((s) => s.likedIds);
  const toggleLike = useLibrary((s) => s.toggleLike);

  const [tab, setTab] = useState<"lyrics" | "queue">("lyrics");

  if (!open) return null;
  const liked = song ? likedIds.has(song.id) : false;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-bg">
      <div className="flex items-center justify-between p-4">
        <button onClick={close} className="text-muted hover:text-text" title="Cerrar">
          <ChevronDown size={26} />
        </button>
        <span className="text-sm font-medium text-muted">Reproduciendo</span>
        <div className="w-7" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 p-8 pt-2 lg:grid-cols-2">
        {/* Left: cover + controls */}
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl bg-surface-2 shadow-2xl">
            {song?.thumbnail ? (
              <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music2 size={64} className="text-muted" />
            )}
          </div>

          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold">{song?.title ?? "Nada sonando"}</h2>
                <p className="truncate text-muted">{song?.artist ?? "—"}</p>
              </div>
              {song && (
                <button
                  onClick={() => toggleLike(song)}
                  className={clsx("shrink-0", liked ? "text-accent" : "text-muted hover:text-text")}
                >
                  <Heart size={24} fill={liked ? "currentColor" : "none"} />
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
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

            <div className="mt-3 flex items-center justify-center gap-6">
              <button onClick={prev} className="text-muted hover:text-text">
                <SkipBack size={26} />
              </button>
              <button
                onClick={toggle}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-text text-bg transition-transform hover:scale-105"
              >
                {loadingTrack ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} className="ml-1" />
                )}
              </button>
              <button onClick={next} className="text-muted hover:text-text">
                <SkipForward size={26} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => song && playRadio(song)}
                disabled={!song || radioLoading}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-accent hover:text-text disabled:opacity-50"
                title="Iniciar radio basada en esta canción"
              >
                {radioLoading ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                Radio
              </button>
              <SleepTimer />
            </div>
          </div>
        </div>

        {/* Right: lyrics / queue */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-surface/40">
          <div className="flex gap-1 border-b border-border p-2">
            {(["lyrics", "queue"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === t ? "bg-surface-2 text-text" : "text-muted hover:text-text"
                )}
              >
                {t === "lyrics" ? "Letra" : `Cola (${queue.length})`}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "lyrics" ? <LyricsPanel /> : <QueueList />}
          </div>
        </div>
      </div>
    </div>
  );
}
