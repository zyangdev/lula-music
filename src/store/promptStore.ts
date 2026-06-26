import { create } from "zustand";

interface PromptOptions {
  title: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
}

interface PromptState extends PromptOptions {
  open: boolean;
  resolve: ((value: string | null) => void) | null;
  ask: (opts: PromptOptions) => Promise<string | null>;
  submit: (value: string | null) => void;
}

export const usePrompt = create<PromptState>((set, get) => ({
  open: false,
  title: "",
  placeholder: "",
  initial: "",
  confirmLabel: "Crear",
  resolve: null,

  ask: (opts) =>
    new Promise((resolve) => {
      // If a prompt was already open, cancel the previous one.
      get().resolve?.(null);
      set({
        open: true,
        title: opts.title,
        placeholder: opts.placeholder ?? "",
        initial: opts.initial ?? "",
        confirmLabel: opts.confirmLabel ?? "Crear",
        resolve,
      });
    }),

  submit: (value) => {
    const resolve = get().resolve;
    set({ open: false, resolve: null });
    resolve?.(value);
  },
}));

/** Ask the user for a line of text. Resolves to the trimmed string, or null if cancelled/empty. */
export function promptText(opts: PromptOptions): Promise<string | null> {
  return usePrompt.getState().ask(opts);
}
