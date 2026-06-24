import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useToasts } from "../store/toastStore";

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm shadow-lg"
        >
          {t.kind === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : (
            <AlertCircle size={18} className="text-red-400" />
          )}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-1 text-muted hover:text-text"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
