import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Search,
  Library,
  Music2,
  Palette,
  User,
  Heart,
  Download,
  ListMusic,
  Check,
} from "lucide-react";
import clsx from "clsx";
import { useUi, ACCENTS } from "../store/uiStore";
import { useLibrary } from "../store/libraryStore";
import { openContextMenu } from "../store/contextMenuStore";
import { buildPlaylistMenu } from "../lib/menus";
import { getSetting } from "../lib/db";
import UpdateButton from "./UpdateButton";

const links = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/search", label: "Buscar", icon: Search, end: false },
  { to: "/library", label: "Biblioteca", icon: Library, end: true },
];

const shortcuts = [
  { to: "/library/liked", label: "Me gusta", icon: Heart },
  { to: "/library/downloads", label: "Descargas", icon: Download },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text"
  );

function ThemePicker() {
  const accent = useUi((s) => s.accent);
  const setAccent = useUi((s) => s.setAccent);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
        title="Cambiar color"
      >
        <Palette size={18} /> Tema
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-2 rounded-lg border border-border bg-surface-2 p-2 shadow-xl">
            {Object.entries(ACCENTS).map(([color, { label }]) => (
              <button
                key={color}
                onClick={() => setAccent(color)}
                title={label}
                style={{ backgroundColor: color }}
                className={clsx(
                  "h-6 w-6 rounded-full transition-transform hover:scale-110",
                  accent === color && "ring-2 ring-white ring-offset-2 ring-offset-surface-2"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [profile, setProfile] = useState<string | null>(null);
  const playlists = useLibrary((s) => s.playlists);
  const addToPlaylist = useLibrary((s) => s.addToPlaylist);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const draggingSong = useUi((s) => s.draggingSong);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const closeSidebar = useUi((s) => s.closeSidebar);
  const [dropId, setDropId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  function commitRename(id: number) {
    const name = editValue.trim();
    const current = playlists.find((p) => p.id === id);
    if (name && current && name !== current.name) void renamePlaylist(id, name);
    setEditingId(null);
  }

  useEffect(() => {
    getSetting("profile_name").then(setProfile);
  }, []);

  return (
    <aside
      className={clsx(
        "flex w-60 shrink-0 flex-col border-r border-border bg-surface",
        // Mobile: off-canvas drawer that slides in. Desktop (md+): static column.
        "fixed inset-y-0 left-0 z-40 transition-transform md:static md:z-auto md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand + main navigation */}
      <div
        className="flex flex-col gap-1 p-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="mb-1 flex items-center gap-3 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Music2 size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Lula</span>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass} onClick={closeSidebar}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Library shortcuts + playlists (scrolls when long) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <nav className="flex flex-col gap-1">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass} onClick={closeSidebar}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Playlists
        </div>
        {playlists.length === 0 ? (
          <p className="px-3 text-xs text-muted">
            Crea playlists en Biblioteca y arrastra canciones aquí.
          </p>
        ) : (
          <nav className="flex flex-col gap-1">
            {playlists.map((p) =>
              editingId === p.id ? (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                >
                  <ListMusic size={18} className="shrink-0 text-muted" />
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(p.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => commitRename(p.id)}
                    className="min-w-0 flex-1 rounded bg-surface px-1 py-0.5 text-sm text-text outline-none ring-1 ring-accent"
                  />
                </div>
              ) : (
                <NavLink
                  key={p.id}
                  to={`/library/playlist/${p.id}`}
                  onClick={closeSidebar}
                  onContextMenu={(e) =>
                    openContextMenu(
                      e,
                      buildPlaylistMenu(p, {
                        onRename: () => {
                          setEditValue(p.name);
                          setEditingId(p.id);
                        },
                      })
                    )
                  }
                  onDragOver={(e) => {
                  if (!draggingSong) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  if (dropId !== p.id) setDropId(p.id);
                }}
                onDragLeave={() => setDropId((cur) => (cur === p.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingSong) {
                    void addToPlaylist(p.id, draggingSong);
                    setFlashId(p.id);
                    setTimeout(
                      () => setFlashId((cur) => (cur === p.id ? null : cur)),
                      600
                    );
                  }
                  setDropId(null);
                }}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    dropId === p.id
                      ? "bg-accent/20 text-text ring-1 ring-accent"
                      : isActive
                        ? "bg-surface-2 text-text"
                        : "text-muted hover:bg-surface-2 hover:text-text",
                    // Hint every playlist as a drop target while dragging.
                    draggingSong && dropId !== p.id && "ring-1 ring-border",
                    flashId === p.id && "drop-flash"
                  )
                }
              >
                {flashId === p.id ? (
                  <Check size={18} className="text-accent" />
                ) : (
                  <ListMusic size={18} />
                )}
                <span className="truncate">{p.name}</span>
              </NavLink>
              )
            )}
          </nav>
        )}
      </div>

      {/* Footer: profile + theme */}
      <div className="flex flex-col gap-1 border-t border-border p-3">
        {profile && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted">
            <User size={18} />
            <span className="truncate">{profile}</span>
          </div>
        )}
        <ThemePicker />
        <UpdateButton />
      </div>
    </aside>
  );
}
