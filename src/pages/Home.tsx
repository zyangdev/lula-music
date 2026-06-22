import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Loader2, Play } from "lucide-react";
import type { Song } from "../types";
import { getHistory } from "../lib/db";
import { usePlayer } from "../store/playerStore";

const CHIPS = [
  "Pop",
  "Reggaetón",
  "Rock",
  "Hip-Hop",
  "Electrónica",
  "Chill",
  "Indie",
  "Salsa",
  "Jazz",
  "Clásica",
];

export default function Home() {
  const [recent, setRecent] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const playRadio = usePlayer((s) => s.playRadio);
  const radioLoading = usePlayer((s) => s.radioLoading);

  useEffect(() => {
    getHistory(12)
      .then(setRecent)
      .finally(() => setLoading(false));
  }, []);

  const seed = recent[0];
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Buenas noches" : hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="p-6">
      <h1 className="mb-5 text-2xl font-bold">{greeting} 👋</h1>

      {/* Genre chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {CHIPS.map((g) => (
          <Link
            key={g}
            to={`/search?q=${encodeURIComponent(g)}`}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-text"
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Daily mix from your last play */}
      {seed && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Tu mix de hoy</h2>
          <button
            onClick={() => playRadio(seed)}
            disabled={radioLoading}
            className="flex w-full max-w-md items-center gap-4 rounded-xl border border-border bg-gradient-to-r from-accent/20 to-surface p-4 text-left transition-colors hover:border-accent disabled:opacity-60"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
              {seed.thumbnail ? (
                <img src={seed.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <Radio size={24} className="text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">Radio basada en lo último que oíste</div>
              <div className="truncate text-sm text-muted">A partir de “{seed.title}”</div>
            </div>
            {radioLoading ? (
              <Loader2 className="animate-spin text-accent" size={22} />
            ) : (
              <Play size={22} className="text-accent" fill="currentColor" />
            )}
          </button>
        </section>
      )}

      {/* Recently played */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Escuchado recientemente</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no has reproducido nada. Ve a{" "}
            <Link to="/search" className="text-accent hover:underline">
              Buscar
            </Link>{" "}
            para empezar.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recent.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => playRadio(s)}
                  className="group w-full text-left"
                  title="Reproducir radio"
                >
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-surface-2">
                    {s.thumbnail && (
                      <img src={s.thumbnail} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute bottom-2 right-2 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-accent text-white opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      <Play size={16} className="ml-0.5" fill="currentColor" />
                    </span>
                  </div>
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="truncate text-xs text-muted">{s.artist}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
