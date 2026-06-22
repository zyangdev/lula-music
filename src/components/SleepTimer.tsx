import { useState, useEffect } from "react";
import { Moon } from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "../store/playerStore";

const OPTIONS = [15, 30, 45, 60];

export default function SleepTimer() {
  const sleepAt = usePlayer((s) => s.sleepAt);
  const setSleepTimer = usePlayer((s) => s.setSleepTimer);
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  // Tick once a second while a timer is active to refresh the countdown.
  useEffect(() => {
    if (!sleepAt) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [sleepAt]);

  const remaining = sleepAt ? Math.max(0, Math.round((sleepAt - Date.now()) / 60000)) : 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
          sleepAt
            ? "border-accent text-accent"
            : "border-border text-muted hover:border-accent hover:text-text"
        )}
        title="Temporizador de apagado"
      >
        <Moon size={16} />
        {sleepAt ? `${remaining} min` : "Dormir"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-40 rounded-lg border border-border bg-surface-2 p-1 shadow-xl">
            {OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSleepTimer(m);
                  setOpen(false);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-surface"
              >
                {m} minutos
              </button>
            ))}
            {sleepAt && (
              <button
                onClick={() => {
                  setSleepTimer(null);
                  setOpen(false);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-red-400 hover:bg-surface"
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
