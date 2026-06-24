import { Link } from "react-router-dom";

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
  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "Buenas noches" : hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="p-6">
      <h1 className="mb-5 text-2xl font-bold">{greeting} 👋</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Explorar géneros</h2>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
