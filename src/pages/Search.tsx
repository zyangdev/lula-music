import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Loader2, AlertCircle } from "lucide-react";
import { searchSongs } from "../lib/api";
import type { Song } from "../types";
import SongList from "../components/SongList";
import { usePlayer } from "../store/playerStore";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);
  const playError = usePlayer((s) => s.error);

  const search = useCallback(async (q: string) => {
    q = q.trim();
    if (!q) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const songs = await searchSongs(q);
      if (id === reqId.current) setResults(songs);
    } catch (err) {
      if (id === reqId.current) {
        setError(err instanceof Error ? err.message : String(err));
        setResults([]);
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Run a search when arriving with a ?q= param (e.g. from Home chips).
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      void search(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setParams(query.trim() ? { q: query.trim() } : {}, { replace: true });
    void search(query);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-3 sm:p-6 sm:pb-3">
        <h1 className="mb-4 text-2xl font-bold">Buscar</h1>
        <form onSubmit={runSearch} className="flex max-w-xl items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 focus-within:border-accent">
          <SearchIcon size={18} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Canciones, artistas, álbumes…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {loading && <Loader2 size={16} className="animate-spin text-muted" />}
        </form>
        {playError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} /> {playError}
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {results.length > 0 ? (
          <SongList songs={results} />
        ) : (
          !loading &&
          searched && (
            <p className="px-2 text-sm text-muted">Sin resultados para "{query}".</p>
          )
        )}
      </div>
    </div>
  );
}
