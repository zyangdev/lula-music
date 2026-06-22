import { useEffect, useState } from "react";
import { Music2, Lock } from "lucide-react";
import { getSetting, setSetting } from "../lib/db";

/**
 * Local-only profile gate. On first run asks for a name + optional PIN.
 * If a PIN is set, locks the app on startup until entered.
 *
 * Note: this is a lightweight local convenience lock, not strong security —
 * the PIN lives in the local SQLite DB.
 */
type Phase = "loading" | "setup" | "locked" | "ready";

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const profile = await getSetting("profile_name");
      const savedPin = await getSetting("profile_pin");
      if (!profile) setPhase("setup");
      else if (savedPin) setPhase("locked");
      else setPhase("ready");
    })();
  }, []);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setError("");
      await setSetting("profile_name", name.trim());
      if (pin.trim()) await setSetting("profile_pin", pin.trim());
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const savedPin = await getSetting("profile_pin");
    if (pinInput === savedPin) {
      setError("");
      setPhase("ready");
    } else {
      setError("PIN incorrecto");
      setPinInput("");
    }
  }

  if (phase === "loading") {
    return <div className="flex h-full items-center justify-center bg-bg" />;
  }

  if (phase === "ready") return <>{children}</>;

  return (
    <div className="flex h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            {phase === "setup" ? (
              <Music2 size={28} className="text-white" />
            ) : (
              <Lock size={26} className="text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold">
            {phase === "setup" ? "Bienvenido a Lula" : "Sesión bloqueada"}
          </h1>
          <p className="text-sm text-muted">
            {phase === "setup"
              ? "Crea tu perfil local. Tus playlists y datos se guardan en este equipo."
              : "Ingresa tu PIN para continuar."}
          </p>
        </div>

        {phase === "setup" ? (
          <form onSubmit={handleSetup} className="flex flex-col gap-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN (opcional, solo números)"
              inputMode="numeric"
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
        ) : (
          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <input
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN"
              inputMode="numeric"
              type="password"
              className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-center text-lg tracking-widest outline-none focus:border-accent"
            />
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent-hover"
            >
              Desbloquear
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
