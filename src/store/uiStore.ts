import { create } from "zustand";
import type { Song } from "../types";
import { getSetting, setSetting } from "../lib/db";

export const ACCENTS: Record<string, { hover: string; label: string }> = {
  "#8b5cf6": { hover: "#a78bfa", label: "Violeta" },
  "#22c55e": { hover: "#4ade80", label: "Verde" },
  "#ef4444": { hover: "#f87171", label: "Rojo" },
  "#3b82f6": { hover: "#60a5fa", label: "Azul" },
  "#f59e0b": { hover: "#fbbf24", label: "Ámbar" },
  "#ec4899": { hover: "#f472b6", label: "Rosa" },
};

const DEFAULT_ACCENT = "#8b5cf6";

function applyAccent(color: string) {
  const accent = ACCENTS[color] ?? ACCENTS[DEFAULT_ACCENT];
  const root = document.documentElement;
  root.style.setProperty("--color-accent", color);
  root.style.setProperty("--color-accent-hover", accent.hover);
}

interface UiState {
  nowPlayingOpen: boolean;
  /** Mobile-only: whether the sidebar drawer is open. */
  sidebarOpen: boolean;
  accent: string;
  /** Song currently being dragged (e.g. onto a sidebar playlist). */
  draggingSong: Song | null;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
  toggleNowPlaying: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setAccent: (color: string) => void;
  loadAccent: () => Promise<void>;
  setDraggingSong: (song: Song | null) => void;
}

export const useUi = create<UiState>((set) => ({
  nowPlayingOpen: false,
  sidebarOpen: false,
  accent: DEFAULT_ACCENT,
  draggingSong: null,

  openNowPlaying: () => set({ nowPlayingOpen: true }),
  closeNowPlaying: () => set({ nowPlayingOpen: false }),
  toggleNowPlaying: () => set((s) => ({ nowPlayingOpen: !s.nowPlayingOpen })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  setDraggingSong: (song) => set({ draggingSong: song }),

  setAccent: (color) => {
    applyAccent(color);
    set({ accent: color });
    void setSetting("accent", color);
  },

  loadAccent: async () => {
    const saved = await getSetting("accent");
    const color = saved && ACCENTS[saved] ? saved : DEFAULT_ACCENT;
    applyAccent(color);
    set({ accent: color });
  },
}));
