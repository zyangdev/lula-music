import { useEffect, useState } from "react";
import { Scissors, X } from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "../store/playerStore";
import { formatTime } from "../lib/format";

/** Parse "m:ss" / "mm:ss" / plain seconds into seconds; null if invalid. */
function parseTime(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const parts = t.split(":");
    if (parts.length !== 2) return null;
    const m = Number(parts[0]);
    const sec = Number(parts[1]);
    if (!Number.isInteger(m) || m < 0 || !Number.isFinite(sec) || sec < 0 || sec >= 60) {
      return null;
    }
    return m * 60 + sec;
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Per-song trim: skip long intros/outros of videoclips. The start/end can be
 * typed manually (m:ss) or captured from the current playback position.
 */
export default function TrimControl() {
  const song = usePlayer((s) => s.current());
  const trims = usePlayer((s) => s.trims);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const setTrim = usePlayer((s) => s.setTrim);
  const clearTrim = usePlayer((s) => s.clearTrim);
  const [open, setOpen] = useState(false);

  const trim = song ? (trims[song.id] ?? null) : null;
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");

  // Sync the editable fields when opening or when the song/trim changes.
  useEffect(() => {
    if (!open) return;
    setStartText(trim ? formatTime(trim.start) : "");
    setEndText(trim?.end != null ? formatTime(trim.end) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, song?.id, trim?.start, trim?.end]);

  if (!song) return null;

  function applyStart(value: string) {
    const v = parseTime(value);
    if (v == null) {
      setStartText(trim ? formatTime(trim.start) : ""); // revert invalid input
      return;
    }
    setTrim(v, trim?.end ?? null);
    setStartText(formatTime(v));
  }

  function applyEnd(value: string) {
    const raw = value.trim();
    if (raw === "") {
      setTrim(trim?.start ?? 0, null); // empty = play to natural end
      setEndText("");
      return;
    }
    const v = parseTime(raw);
    if (v == null) {
      setEndText(trim?.end != null ? formatTime(trim.end) : "");
      return;
    }
    setTrim(trim?.start ?? 0, v);
    setEndText(formatTime(v));
  }

  function markStart() {
    setTrim(currentTime, trim?.end ?? null);
    setStartText(formatTime(currentTime));
  }
  function markEnd() {
    setTrim(trim?.start ?? 0, currentTime);
    setEndText(formatTime(currentTime));
  }

  const inputCls =
    "w-16 rounded-md bg-surface px-2 py-1 text-center text-sm tabular-nums text-text outline-none ring-1 ring-border focus:ring-accent";
  const markCls = "rounded-md bg-surface px-2 py-1 text-xs text-muted hover:bg-border hover:text-text";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
          trim
            ? "border-accent text-accent"
            : "border-border text-muted hover:border-accent hover:text-text"
        )}
        title="Recortar canción (saltar intro/outro)"
      >
        <Scissors size={16} />
        {trim
          ? `${formatTime(trim.start)} – ${trim.end != null ? formatTime(trim.end) : formatTime(duration)}`
          : "Recortar"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-20 mb-2 w-80 -translate-x-1/2 rounded-lg border border-border bg-surface-2 p-3 shadow-xl">
            <div className="mb-1 text-sm font-semibold">Recortar canción</div>
            <p className="mb-3 text-xs text-muted">
              Escribe el tiempo (<code>m:ss</code>) o usa “Marcar aquí” con la reproducción.
              Deja el fin vacío para llegar al final.
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-12 text-sm">Inicio</span>
                <input
                  value={startText}
                  onChange={(e) => setStartText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => applyStart(e.target.value)}
                  placeholder="0:00"
                  inputMode="numeric"
                  className={inputCls}
                />
                <button onClick={markStart} className={markCls}>
                  Marcar aquí
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-sm">Fin</span>
                <input
                  value={endText}
                  onChange={(e) => setEndText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => applyEnd(e.target.value)}
                  placeholder="—"
                  inputMode="numeric"
                  className={inputCls}
                />
                <button onClick={markEnd} className={markCls}>
                  Marcar aquí
                </button>
              </div>
            </div>

            {trim && (
              <button
                onClick={() => {
                  clearTrim();
                  setOpen(false);
                }}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs text-muted hover:border-red-400 hover:text-red-400"
              >
                <X size={14} /> Quitar recorte
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
