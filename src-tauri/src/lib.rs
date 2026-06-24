mod playlist_io;
mod youtube;
mod ytmobile;

use tauri_plugin_sql::{Migration, MigrationKind};
use youtube::Song;

/// Run an Android plugin call off the async runtime (the bridge blocks).
#[cfg(target_os = "android")]
async fn on_android<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn search_songs(
    app: tauri::AppHandle,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<Song>, String> {
    let limit = limit.unwrap_or(20);
    #[cfg(target_os = "android")]
    return on_android(move || ytmobile::search(&app, &query, limit)).await;
    #[cfg(not(target_os = "android"))]
    youtube::search(&app, &query, limit).await
}

#[tauri::command]
async fn resolve_stream(app: tauri::AppHandle, video_id: String) -> Result<String, String> {
    #[cfg(target_os = "android")]
    return on_android(move || ytmobile::resolve_stream(&app, &video_id)).await;
    #[cfg(not(target_os = "android"))]
    youtube::resolve_stream(&app, &video_id).await
}

#[tauri::command]
async fn download_song(app: tauri::AppHandle, video_id: String) -> Result<String, String> {
    #[cfg(target_os = "android")]
    return on_android(move || ytmobile::download(&app, &video_id)).await;
    #[cfg(not(target_os = "android"))]
    youtube::download(&app, &video_id).await
}

#[tauri::command]
async fn get_radio(
    app: tauri::AppHandle,
    video_id: String,
    limit: Option<u32>,
) -> Result<Vec<Song>, String> {
    let limit = limit.unwrap_or(25);
    #[cfg(target_os = "android")]
    return on_android(move || ytmobile::radio(&app, &video_id, limit)).await;
    #[cfg(not(target_os = "android"))]
    youtube::radio(&app, &video_id, limit).await
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
        version: 1,
        description: "create_library_tables",
        sql: "
            CREATE TABLE IF NOT EXISTS songs (
                id        TEXT PRIMARY KEY,
                title     TEXT NOT NULL,
                artist    TEXT NOT NULL,
                album     TEXT,
                thumbnail TEXT,
                duration  REAL
            );
            CREATE TABLE IF NOT EXISTS likes (
                song_id  TEXT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
                liked_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS playlists (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS playlist_songs (
                playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                song_id     TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                added_at    INTEGER NOT NULL,
                PRIMARY KEY (playlist_id, song_id)
            );
            CREATE TABLE IF NOT EXISTS history (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id   TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
                played_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS downloads (
                song_id       TEXT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
                path          TEXT NOT NULL,
                downloaded_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
        ",
        kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_song_trims",
            sql: "
            CREATE TABLE IF NOT EXISTS song_trims (
                song_id   TEXT PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
                start_sec REAL NOT NULL DEFAULT 0,
                end_sec   REAL
            );
        ",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:lula.db", migrations())
                .build(),
        );

    // El sidecar yt-dlp (plugin shell) solo en escritorio.
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_shell::init());
    }

    // El updater solo existe en escritorio (ver Cargo.toml). En Android/iOS
    // la actualización se gestiona por separado (descarga del APK).
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    // En Android la extracción de YouTube la hace el plugin Kotlin (NewPipeExtractor).
    #[cfg(target_os = "android")]
    {
        builder = builder.plugin(ytmobile::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![
            search_songs,
            resolve_stream,
            download_song,
            get_radio,
            playlist_io::write_text_file,
            playlist_io::read_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
