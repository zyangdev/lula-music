import { create } from "zustand";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  /** A horizontal divider; other fields are ignored. */
  separator?: boolean;
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  /** Red, destructive styling (e.g. delete). */
  danger?: boolean;
  submenu?: MenuItem[];
}

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  openMenu: (x: number, y: number, items: MenuItem[]) => void;
  close: () => void;
}

export const useContextMenu = create<ContextMenuState>((set) => ({
  open: false,
  x: 0,
  y: 0,
  items: [],
  openMenu: (x, y, items) => set({ open: true, x, y, items }),
  close: () => set({ open: false, items: [] }),
}));

/** Convenience: open the menu from a React mouse event at the cursor. */
export function openContextMenu(e: React.MouseEvent, items: MenuItem[]) {
  e.preventDefault();
  e.stopPropagation();
  useContextMenu.getState().openMenu(e.clientX, e.clientY, items);
}
