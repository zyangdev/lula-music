# Changelog

Todas las novedades relevantes de **Lula**. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado,
[SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [0.2.0] - 2026-06-26

### Added
- ➕ **Crear playlists desde cualquier sitio**: botón «+» junto a *Playlists* en el
  menú lateral, clic derecho sobre una playlist o en el área vacía, y la opción
  **«Nueva playlist…»** al añadir una canción a una playlist (la crea y la añade
  de una vez). Usa un diálogo de nombre propio (sin `prompt()` del sistema).

### Changed
- 📱 **UI móvil más pulida**: se eliminan los *scrolls horizontales* (cabeceras y
  barras de acciones que ahora hacen *wrap*), paddings ajustados al ancho del
  teléfono y los botones de cada canción (me gusta / añadir / descargar) ahora
  **siempre visibles en pantallas táctiles** (antes solo aparecían al pasar el
  ratón, quedando inaccesibles en móvil).

### Fixed
- 🐷 **Icono de la app en Android**: ahora usa un *adaptive icon* correcto (el
  cerdito centrado sobre fondo lavanda) en vez de caer al PNG cuadrado, que en
  los lanzadores modernos se veía como un cuadradito sobre fondo blanco.

## [0.1.3] - 2026-06-24

### Added
- 📤 **Exportar / importar playlists** a un archivo `.lula.json`: respáldalas o
  compártelas entre equipos. Desde **Biblioteca** (Importar / Exportar todas),
  el detalle de una playlist (Exportar) y el menú contextual de cada playlist.
- **Avisos (toasts)** para confirmar acciones como export/import.
- 📱 **App para Android** (APK directo): misma interfaz, con extracción de
  YouTube nativa mediante **NewPipeExtractor**. UI adaptada a móvil (menú
  lateral deslizable). _Se distribuye aparte del instalador de escritorio._

## [0.1.2] - 2026-06-22

### Fixed
- La app ya no se queda en **pantalla negra** si la base de datos no se puede abrir
  (p. ej. datos de una versión más nueva): muestra un mensaje claro con opción de
  reintentar en lugar de colgarse en la carga inicial.

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

[Unreleased]: https://github.com/zyangdev/lula-music/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/zyangdev/lula-music/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/zyangdev/lula-music/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/zyangdev/lula-music/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zyangdev/lula-music/releases/tag/v0.1.0
