import { useEffect, useState } from "react";
import { Music2, AlertTriangle } from "lucide-react";
import { getSetting, setSetting } from "../lib/db";

/**
 * Local-only profile gate. On first run asks for a name; after that the app
 * opens straight to the library. All data lives in the local SQLite DB.
 */
type Phase = "loading" | "setup" | "ready" | "error";

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const profile = await getSetting("profile_name");
        setPhase(profile ? "ready" : "setup");
      } catch (err) {
        // DB failed to open (e.g. data from a newer app version) — show a
        // clear message instead of hanging on a black "loading" screen.
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      }
    })();
  }, []);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setError("");
      await setSetting("profile_name", name.trim());
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (phase === "loading") {
    return <div className="flex h-full items-center justify-center bg-bg" />;
  }

  if (phase === "error") {
    return (
      <div className="flex h-full items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/15">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold">No se pudo abrir tu biblioteca</h1>
          <p className="mb-4 text-sm text-muted">
            Puede que tus datos sean de una versión más nueva de Lula. Actualiza la app
            a la última versión para abrirlos.
          </p>
          {error && (
            <p className="mb-4 break-words rounded-md bg-surface-2 p-2 text-left text-xs text-muted">
              {error}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready") return <>{children}</>;

  return (
    <div className="flex h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Music2 size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold">Bienvenido a Lula</h1>
          <p className="text-sm text-muted">
            Crea tu perfil local. Tus playlists y datos se guardan en este equipo.
          </p>
        </div>

        <form onSubmit={handleSetup} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="mt-1 rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent-hover"
          >
            Empezar
          </button>
        </form>
      </div>
    </div>
  );
}
