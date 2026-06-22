import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import PlayerBar from "./PlayerBar";
import NowPlaying from "./NowPlaying";
import ContextMenu from "./ContextMenu";

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

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <PlayerBar />
      <NowPlaying />
      <ContextMenu />
    </div>
  );
}
