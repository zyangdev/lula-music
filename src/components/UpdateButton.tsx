import { useRef, useState } from "react";
import { RefreshCw, Download, Loader2, CircleCheck, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; version: string }
  | { kind: "downloading" }
  | { kind: "error" };

const ROW = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

export default function UpdateButton() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const updateRef = useRef<Update | null>(null);

  async function handleCheck() {
    setState({ kind: "checking" });
    try {
      const update = await check();
      updateRef.current = update;
      if (update) setState({ kind: "available", version: update.version });
      else setState({ kind: "uptodate" });
    } catch {
      setState({ kind: "error" });
    }
  }

  async function handleInstall() {
    const update = updateRef.current;
    if (!update) return handleCheck();
    setState({ kind: "downloading" });
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      setState({ kind: "error" });
    }
  }

  switch (state.kind) {
    case "checking":
      return (
        <div className={clsx(ROW, "text-muted")}>
          <Loader2 size={18} className="animate-spin" /> Buscando…
        </div>
      );
    case "downloading":
      return (
        <div className={clsx(ROW, "text-accent")}>
          <Loader2 size={18} className="animate-spin" /> Descargando…
        </div>
      );
    case "available":
      return (
        <button onClick={handleInstall} className={clsx(ROW, "text-accent hover:bg-surface-2")}>
          <Download size={18} /> Actualizar a {state.version}
        </button>
      );
    case "uptodate":
      return (
        <button onClick={handleCheck} className={clsx(ROW, "text-green-400 hover:bg-surface-2")}>
          <CircleCheck size={18} /> Estás al día
        </button>
      );
    case "error":
      return (
        <button onClick={handleCheck} className={clsx(ROW, "text-red-400 hover:bg-surface-2")}>
          <AlertCircle size={18} /> Reintentar búsqueda
        </button>
      );
    default:
      return (
        <button
          onClick={handleCheck}
          className={clsx(ROW, "text-muted hover:bg-surface-2 hover:text-text")}
        >
          <RefreshCw size={18} /> Buscar actualizaciones
        </button>
      );
  }
}
