//! Android-only bridge to the Kotlin `YoutubePlugin` (NewPipeExtractor).
//!
//! On desktop the YouTube layer is `yt-dlp` (see `youtube.rs`). On Android there
//! is no yt-dlp binary, so search/stream/download/radio are implemented natively
//! in Kotlin and invoked here through the Tauri mobile-plugin bridge.
#![cfg(target_os = "android")]

use serde::Deserialize;
use serde_json::json;
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime, Wry,
};

use crate::youtube::Song;

/// Holds the handle to the registered Kotlin plugin.
pub struct YoutubeMobile<R: Runtime>(pub PluginHandle<R>);

/// Register the Kotlin `com.lula.app.YoutubePlugin` and stash its handle.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ytmobile")
        .setup(|app, api| {
            let handle = api.register_android_plugin("com.lula.app", "YoutubePlugin")?;
            app.manage(YoutubeMobile(handle));
            Ok(())
        })
        .build()
}

#[derive(Deserialize)]
struct SongsResp {
    songs: Vec<Song>,
}
#[derive(Deserialize)]
struct UrlResp {
    url: String,
}
#[derive(Deserialize)]
struct PathResp {
    path: String,
}
#[derive(Deserialize)]
struct ContentsResp {
    contents: String,
}

fn handle(app: &AppHandle) -> Result<tauri::State<'_, YoutubeMobile<Wry>>, String> {
    app.try_state::<YoutubeMobile<Wry>>()
        .ok_or_else(|| "plugin de YouTube no inicializado".to_string())
}

pub fn search(app: &AppHandle, query: &str, limit: u32) -> Result<Vec<Song>, String> {
    let resp: SongsResp = handle(app)?
        .0
        .run_mobile_plugin("search", json!({ "query": query, "limit": limit }))
        .map_err(|e| format!("búsqueda (Android): {e}"))?;
    Ok(resp.songs)
}

pub fn radio(app: &AppHandle, video_id: &str, limit: u32) -> Result<Vec<Song>, String> {
    let resp: SongsResp = handle(app)?
        .0
        .run_mobile_plugin("radio", json!({ "videoId": video_id, "limit": limit }))
        .map_err(|e| format!("radio (Android): {e}"))?;
    Ok(resp.songs)
}

pub fn resolve_stream(app: &AppHandle, video_id: &str) -> Result<String, String> {
    let resp: UrlResp = handle(app)?
        .0
        .run_mobile_plugin("resolveStream", json!({ "videoId": video_id }))
        .map_err(|e| format!("stream (Android): {e}"))?;
    Ok(resp.url)
}

pub fn download(app: &AppHandle, video_id: &str) -> Result<String, String> {
    let resp: PathResp = handle(app)?
        .0
        .run_mobile_plugin("download", json!({ "videoId": video_id }))
        .map_err(|e| format!("descarga (Android): {e}"))?;
    Ok(resp.path)
}

/// Read a content:// URI (from the file dialog) as text via Android.
pub fn read_text_file(app: &AppHandle, uri: &str) -> Result<String, String> {
    let resp: ContentsResp = handle(app)?
        .0
        .run_mobile_plugin("readTextFile", json!({ "uri": uri }))
        .map_err(|e| format!("leer archivo (Android): {e}"))?;
    Ok(resp.contents)
}

/// Write text to a content:// URI (from the save dialog) via Android.
pub fn write_text_file(app: &AppHandle, uri: &str, contents: &str) -> Result<(), String> {
    handle(app)?
        .0
        .run_mobile_plugin::<serde_json::Value>("writeTextFile", json!({ "uri": uri, "contents": contents }))
        .map_err(|e| format!("escribir archivo (Android): {e}"))?;
    Ok(())
}
