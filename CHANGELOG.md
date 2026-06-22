# Changelog

Todas las novedades relevantes de **Lula**. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado,
[SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [0.1.1] - 2026-06-22

### Added
- ✂️ **Recorte de canciones (trim)**: marca un inicio y un fin por canción (desde
  Now Playing) para saltarte las intros/outros largas de los videoclips. Se guarda
  en local y el reproductor lo respeta siempre — empieza en el inicio marcado y corta
  en el fin (avanza a la siguiente o repite).
- **Edición manual del tiempo de recorte**: además de “Marcar aquí” (que usa la
  posición de reproducción), ahora puedes **escribir** el inicio/fin a mano (`m:ss`).
- `CHANGELOG.md` y README reescrito con todas las características y la guía de
  publicación de versiones.

## [0.1.0] - 2026-06-22

Primera versión pública, ya con **auto-actualización**.

### Added
- **Reproducción**: búsqueda en YouTube (vía `yt-dlp`), cola, aleatorio, repetir
  (todo/una), autoplay y **radio** (cola continua de canciones relacionadas).
- **Restauración de sesión**: al reabrir vuelve la última canción en la posición
  donde la dejaste.
- **Biblioteca local (SQLite)**: me gusta, historial, playlists
  (crear/renombrar/eliminar/reordenar), descargas offline y perfil con PIN opcional.
- **Descargas**: marca visible de "descargada" y botón **"Descargar todo"** en las listas.
- **Interfaz**: letras sincronizadas (LRCLIB), vista **Now Playing** a pantalla completa,
  sleep timer, temas de acento, y sidebar con accesos directos + playlists.
- **Drag & drop**: arrastrar canciones a playlists (desde listas, cola o la barra),
  y reordenar la cola y las playlists.
- **Menús contextuales** (click derecho) para canciones y playlists.
- **Mini-cola** accesible desde la barra de reproducción.
- **Auto-actualización** firmada (plugin updater de Tauri + GitHub Releases).
- Icono de la app 🐷.

### Fixed
- Drag & drop dentro del WebView de Tauri (`dragDropEnabled: false` + `-webkit-user-drag`).
- Arrastre desde la mini-cola hacia las playlists del sidebar.

[Unreleased]: https://github.com/zyangdev/lula-music/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/zyangdev/lula-music/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zyangdev/lula-music/releases/tag/v0.1.0
