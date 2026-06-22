# Lula 🎵

Reproductor de música de escritorio para Windows que usa **YouTube** como fuente.
Inspirado en las features de [Metrolist](https://github.com/mostafaalagamy/Metrolist) (Android),
construido con **Tauri 2 + React + TypeScript**.

> Uso personal / educativo, igual que Metrolist.

## Arquitectura

```
WebView (React + TS + Tailwind)        ← UI, <audio> HTML5, estado del player (Zustand)
        │  Tauri IPC (invoke)
Core Rust (Tauri 2)                     ← comandos: search_songs, resolve_stream
        │  sidecar
yt-dlp.exe (binario empaquetado)        ← búsqueda + resolución de stream de audio
```

- **Búsqueda y stream** se hacen con el sidecar `yt-dlp` (descifra signature/`n` de forma robusta).
- **Datos locales** (playlists, likes, historial): SQLite — Fase 2.
- Pensado **local-first**, con una capa `Repository` para enchufar sync en la nube más adelante.

## Requisitos

- [Node.js](https://nodejs.org) + [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs) (toolchain `stable-x86_64-pc-windows-msvc`)
- **Visual Studio Build Tools 2022** con el workload "Desarrollo para el escritorio con C++"
- WebView2 Runtime (viene con Windows 11)

El binario `src-tauri/binaries/yt-dlp-x86_64-pc-windows-msvc.exe` se incluye como sidecar.

## Desarrollo

```bash
pnpm install
pnpm tauri dev      # app de escritorio con hot-reload
```

## Build

```bash
pnpm tauri build    # instalador en src-tauri/target/release/bundle
```

## Roadmap

- [x] **Fase 0** — Setup, layout (sidebar + player bar), routing
- [~] **Fase 1** — Búsqueda en YouTube, reproducción, cola
- [ ] **Fase 2** — Biblioteca local (SQLite): playlists, likes, historial, perfil local
- [ ] **Fase 3** — Descubrimiento: home feed, artista/álbum, radio/autoplay
- [ ] **Fase 4** — Letras sincronizadas, sleep timer, temas, mini-player
- [ ] **Fase 5** — Offline, media keys (SMTC), atajos, auto-update
- [ ] **Fase 6** — Sync en la nube + login real (opcional)

## Estructura

```
src/                 Frontend React
  components/         Sidebar, PlayerBar, SongList, AppLayout
  pages/              Home, Search, Library
  store/              playerStore (Zustand)
  lib/                api (invoke), format
src-tauri/           Core Rust
  src/youtube.rs      búsqueda + resolución vía yt-dlp
  src/lib.rs          comandos Tauri
  binaries/           sidecar yt-dlp
```
