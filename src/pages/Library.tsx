import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Download, Plus, ListMusic, Trash2, Upload, FileDown } from "lucide-react";
import { useLibrary } from "../store/libraryStore";
import { openContextMenu } from "../store/contextMenuStore";
import { buildPlaylistMenu } from "../lib/menus";
import { toast } from "../store/toastStore";

export default function Library() {
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const exportAllPlaylists = useLibrary((s) => s.exportAllPlaylists);
  const importPlaylists = useLibrary((s) => s.importPlaylists);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  function commitRename(id: number) {
    const next = editValue.trim();
    const current = playlists.find((p) => p.id === id);
    if (next && current && next !== current.name) void renamePlaylist(id, next);
    setEditingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlaylist(name);
    setName("");
  }

  async function handleImport() {
    try {
      const count = await importPlaylists();
      if (count != null) toast.success(`${count} playlist(s) importada(s).`);
    } catch (e) {
      console.error("[lula] import error:", e);
      toast.error(`No se pudo importar: ${e}`);
    }
  }

  async function handleExportAll() {
    try {
      const path = await exportAllPlaylists();
      if (path) toast.success("Playlists exportadas.");
      else if (playlists.length === 0) toast.error("No tienes playlists para exportar.");
    } catch (e) {
      toast.error(`No se pudo exportar: ${e}`);
    }
  }

  const cards = [
    { to: "/library/liked", label: "Me gusta", icon: Heart, color: "bg-accent" },
    { to: "/library/downloads", label: "Descargas", icon: Download, color: "bg-emerald-600" },
  ];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-5 text-2xl font-bold">Tu biblioteca</h1>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
              <Icon size={22} className="text-white" />
            </div>
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Playlists</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-text"
            title="Importar playlists desde un archivo"
          >
            <Upload size={15} /> Importar
          </button>
          {playlists.length > 0 && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-text"
              title="Exportar todas las playlists"
            >
              <FileDown size={15} /> Exportar todas
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-4 flex max-w-md items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la playlist…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus size={16} /> Crear
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="text-sm text-muted">Aún no tienes playlists. Crea una arriba 👆</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="group relative"
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
            >
              <Link
                to={`/library/playlist/${p.id}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex h-24 items-center justify-center rounded-lg bg-surface-2">
                  <ListMusic size={32} className="text-muted" />
                </div>
                <div>
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(p.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => commitRename(p.id)}
                      className="w-full rounded bg-surface-2 px-1 py-0.5 text-sm font-medium text-text outline-none ring-1 ring-accent"
                    />
                  ) : (
                    <div className="truncate font-medium">{p.name}</div>
                  )}
                  <div className="text-xs text-muted">{p.count} canciones</div>
                </div>
              </Link>
              <button
                onClick={() => deletePlaylist(p.id)}
                className="absolute right-2 top-2 rounded-md bg-black/40 p-1.5 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                title="Eliminar playlist"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
