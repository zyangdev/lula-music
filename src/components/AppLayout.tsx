import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Music2 } from "lucide-react";
import Sidebar from "./Sidebar";
import PlayerBar from "./PlayerBar";
import NowPlaying from "./NowPlaying";
import ContextMenu from "./ContextMenu";
import Toaster from "./Toaster";
import PromptDialog from "./PromptDialog";
import { useUi } from "../store/uiStore";

export default function AppLayout() {
  // Suppress the webview's native context menu so ours is the only one —
  // except over text fields, where the native copy/paste menu is useful.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const closeSidebar = useUi((s) => s.closeSidebar);

  return (
    <div className="relative flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        {/* Backdrop for the mobile drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={closeSidebar}
          />
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile top bar with hamburger (hidden on desktop).
              paddingTop respects the status bar (safe-area) so the menu button
              isn't under it. */}
          <div
            className="flex items-center gap-3 border-b border-border bg-surface px-2 pb-3 md:hidden"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          >
            <button
              onClick={toggleSidebar}
              aria-label="Abrir menú"
              className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
                <Music2 size={14} className="text-white" />
              </div>
              <span className="font-semibold">Lula</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
      <PlayerBar />
      <NowPlaying />
      <ContextMenu />
      <PromptDialog />
      <Toaster />
    </div>
  );
}
