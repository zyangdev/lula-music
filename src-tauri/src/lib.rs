mod youtube;

use tauri_plugin_sql::{Migration, MigrationKind};
use youtube::Song;

#[tauri::command]
async fn search_songs(
    app: tauri::AppHandle,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<Song>, String> {
    youtube::search(&app, &query, limit.unwrap_or(20)).await
}

#[tauri::command]
async fn resolve_stream(app: tauri::AppHandle, video_id: String) -> Result<String, String> {
    youtube::resolve_stream(&app, &video_id).await
}

#[tauri::command]
async fn download_song(app: tauri::AppHandle, video_id: String) -> Result<String, String> {
    youtube::download(&app, &video_id).await
}

#[tauri::command]
async fn get_radio(
    app: tauri::AppHandle,
    video_id: String,
    limit: Option<u32>,
) -> Result<Vec<Song>, String> {
    youtube::radio(&app, &video_id, limit.unwrap_or(25)).await
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
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:lula.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            search_songs,
            resolve_stream,
            download_song,
            get_radio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
