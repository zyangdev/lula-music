import { useEffect, useState } from "react";
import { usePrompt } from "../store/promptStore";

/**
 * A single, app-wide text-input modal. Triggered imperatively via `promptText()`
 * so non-React code (context menus) can ask the user for a name. Replaces the
 * native `prompt()`, which webviews block.
 */
export default function PromptDialog() {
  const { open, title, placeholder, initial, confirmLabel, submit } = usePrompt();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(initial ?? "");
  }, [open, initial]);

  if (!open) return null;

  function confirm() {
    submit(value.trim() || null);
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => submit(null)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") submit(null);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => submit(null)}
            className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-text"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
