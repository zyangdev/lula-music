# Lula 🐷🎵

Reproductor de música de escritorio para Windows que usa **YouTube** como fuente.
Inspirado en las features de [Metrolist](https://github.com/mostafaalagamy/Metrolist) (Android),
construido con **Tauri 2 + React + TypeScript**.

> Uso personal / educativo, igual que Metrolist.

📋 Novedades de cada versión en el [CHANGELOG](CHANGELOG.md).

## ✨ Características

### Reproducción
- 🔎 **Búsqueda en YouTube** y reproducción por streaming (vía `yt-dlp`).
- ▶️ **Cola de reproducción** con reordenar por arrastre, saltar, quitar, "reproducir a continuación".
- 🔀 **Aleatorio**, 🔁 **repetir** (todo / una), y ♾️ **autoplay** (radio automática al terminar).
- 📻 **Radio**: genera una cola continua de canciones relacionadas a partir de una semilla.
- ✂️ **Recorte de canciones (trim)**: marca un inicio y un fin por canción para saltarte
  las intros/outros largas de los videoclips. Se guarda y se respeta siempre.
- 🎚️ **Restauración de sesión**: al reabrir, vuelve la última canción en la posición donde la dejaste.

### Biblioteca (local-first, SQLite)
- ❤️ **Me gusta**, 🕘 **Historial**, 📃 **Playlists** (crear, renombrar, eliminar, reordenar).
- ⬇️ **Descargas offline**: descarga canciones sueltas o **toda una lista**; marca visible de descargada.
- 👤 **Perfil local** con PIN opcional (sin backend; todo en tu equipo).

### Interfaz
- 🎨 **Temas de acento** de color.
- 🎤 **Letras sincronizadas** (LRCLIB) y vista **Now Playing** a pantalla completa.
- 😴 **Sleep timer**.
- 🖱️ **Menús contextuales** (click derecho) en canciones y playlists.
- 🤏 **Drag & drop**: arrastra canciones a playlists (desde listas, cola o la barra) y reordena colas/playlists.
- 📋 **Mini-cola** accesible desde la barra de reproducción.

### Distribución
- 🔄 **Auto-actualización** firmada (plugin updater de Tauri + GitHub Releases).

## Arquitectura

```
WebView (React + TS + Tailwind v4 + Zustand)   ← UI, <audio> HTML5, estado del player
        │  Tauri IPC (invoke)
Core Rust (Tauri 2)                            ← comandos: search_songs, resolve_stream,
        │  sidecar                                download_song, get_radio
yt-dlp.exe (binario empaquetado)               ← búsqueda + stream + descarga
        │
SQLite (tauri-plugin-sql)                      ← playlists, likes, historial, descargas,
                                                  perfil, recortes, ajustes
```

- **Búsqueda, stream y descarga** se hacen con el sidecar `yt-dlp` (descifra signature/`n` de forma robusta).
- **Datos locales** en SQLite tras una capa `Repository` (`src/lib/db.ts`), pensada para enchufar
  sync en la nube más adelante sin tocar la UI.
- **Reproducción offline** de lo descargado vía `assetProtocol` + `convertFileSrc`.

## Requisitos

- [Node.js](https://nodejs.org) **22+** + [pnpm](https://pnpm.io) **11+**
- [Rust](https://rustup.rs) (toolchain `stable-x86_64-pc-windows-msvc`)
- **Visual Studio Build Tools 2022** con el workload "Desarrollo para el escritorio con C++"
- WebView2 Runtime (viene con Windows 11)

El binario `src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe` se incluye como sidecar.

> Nota: ejecuta `cargo`/`pnpm tauri` desde **PowerShell**, no Git Bash (el `link` de coreutils
> tapa al `link.exe` de MSVC).

## Desarrollo

```bash
pnpm install
pnpm tauri dev      # app de escritorio con hot-reload
```

## Build

```bash
pnpm tauri build    # exe + instaladores en src-tauri/target/release/bundle
```

Genera `lula.exe` (portátil, mantén `yt-dlp.exe` al lado), un instalador **NSIS** (`-setup.exe`)
y uno **MSI**.

## Auto-actualización

Las versiones se publican desde **GitHub Actions** (`.github/workflows/release.yml`, vía `tauri-action`).
Para sacar una versión nueva:

1. Sube `version` en `tauri.conf.json` (y `src-tauri/Cargo.toml`), p. ej. `0.1.1`.
2. `git tag v0.1.1 && git push origin v0.1.1`.
3. La Action compila, **firma** (con `TAURI_SIGNING_PRIVATE_KEY`, guardada como secret) y crea
   un release borrador con los instaladores + `latest.json`.
4. Publica el release en GitHub ("Publish release").
5. Las apps instaladas lo detectan con **"Buscar actualizaciones"**, verifican la firma y se actualizan solas.

> La clave privada de firma vive **solo** en local (`~/.tauri/lula_updater.key`) y como secret del repo;
> nunca se commitea.

## Roadmap

- [x] **Fase 0** — Setup, layout (sidebar + player bar), routing
- [x] **Fase 1** — Búsqueda en YouTube, reproducción, cola
- [x] **Fase 2** — Biblioteca local (SQLite): playlists, likes, historial, perfil local
- [x] **Fase 3** — Descubrimiento: home feed, chips de género, radio/autoplay
- [x] **Fase 4** — Letras sincronizadas, sleep timer, temas, Now Playing
- [~] **Fase 5** — Offline ✅, auto-update ✅, drag&drop ✅, recorte ✅ · pendiente: media keys (SMTC), atajos
- [ ] **Fase 6** — Sync en la nube + login real (opcional)

## Estructura

```
src/                  Frontend React
  components/          Sidebar, PlayerBar, NowPlaying, QueueList, SongList,
                       ContextMenu, TrimControl, UpdateButton, SleepTimer…
  pages/               Home, Search, Library, LikedSongs, History, Downloads, PlaylistDetail
  store/               playerStore, libraryStore, uiStore, contextMenuStore (Zustand)
  lib/                 db (repository SQLite), api (invoke), lyrics, menus, format
src-tauri/            Core Rust
  src/youtube.rs       búsqueda + stream + descarga vía yt-dlp
  src/lib.rs           comandos Tauri + migraciones SQLite
  binaries/            sidecar yt-dlp
  icons/               icono de la app (🐷)
.github/workflows/    release.yml (build + firma + publicación)
```
