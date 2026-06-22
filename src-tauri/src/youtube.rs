//! YouTube access layer.
//!
//! Fase 1 uses the bundled `yt-dlp` sidecar for both search and stream
//! resolution — it handles signature/`n`-param deciphering robustly so we
//! don't have to. A native InnerTube client (cleaner YT Music results) can
//! replace the search path later without touching the frontend contract.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// A playable track. Mirrors the `Song` interface in the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub thumbnail: Option<String>,
    /// duration in seconds
    pub duration: Option<f64>,
}

/// Raw shape of a `--flat-playlist --dump-json` entry (only fields we use).
#[derive(Debug, Deserialize)]
struct FlatEntry {
    id: Option<String>,
    title: Option<String>,
    #[serde(default)]
    channel: Option<String>,
    #[serde(default)]
    uploader: Option<String>,
    #[serde(default)]
    duration: Option<f64>,
}

/// Run the yt-dlp sidecar and return (stdout, stderr) as UTF-8 strings.
async fn run_ytdlp(app: &AppHandle, args: Vec<String>) -> Result<(String, String), String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("no se pudo localizar yt-dlp: {e}"))?
        .args(args)
        .output()
        .await
        .map_err(|e| format!("fallo al ejecutar yt-dlp: {e}"))?;

    Ok((
        String::from_utf8_lossy(&output.stdout).into_owned(),
        String::from_utf8_lossy(&output.stderr).into_owned(),
    ))
}

/// Search music on YouTube. Uses a flat (metadata-only) search so it's fast.
pub async fn search(app: &AppHandle, query: &str, limit: u32) -> Result<Vec<Song>, String> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let search_term = format!("ytsearch{}:{}", limit.clamp(1, 50), query);
    let (stdout, _stderr) = run_ytdlp(
        app,
        vec![
            "--flat-playlist".into(),
            "--dump-json".into(),
            "--no-warnings".into(),
            "--ignore-errors".into(),
            search_term,
        ],
    )
    .await?;

    Ok(parse_entries(&stdout))
}

/// Parse `--dump-json` (one JSON object per line) into songs.
fn parse_entries(stdout: &str) -> Vec<Song> {
    let mut songs = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let entry: FlatEntry = match serde_json::from_str(line) {
            Ok(e) => e,
            Err(_) => continue,
        };
        let Some(id) = entry.id else { continue };
        let artist = entry
            .channel
            .or(entry.uploader)
            .map(|c| c.trim_end_matches(" - Topic").to_string())
            .unwrap_or_else(|| "Desconocido".into());
        songs.push(Song {
            thumbnail: Some(format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg")),
            title: entry.title.unwrap_or_else(|| "Sin título".into()),
            artist,
            album: None,
            duration: entry.duration,
            id,
        });
    }
    songs
}

/// Build a radio/autoplay queue of songs related to `video_id` using
/// YouTube's "RD" mix playlist. The seed song itself is filtered out.
pub async fn radio(app: &AppHandle, video_id: &str, limit: u32) -> Result<Vec<Song>, String> {
    let url = format!("https://www.youtube.com/watch?v={video_id}&list=RD{video_id}");
    let (stdout, _stderr) = run_ytdlp(
        app,
        vec![
            "--flat-playlist".into(),
            "--dump-json".into(),
            "--no-warnings".into(),
            "--ignore-errors".into(),
            "--playlist-end".into(),
            limit.clamp(1, 50).to_string(),
            url,
        ],
    )
    .await?;

    let songs = parse_entries(&stdout)
        .into_iter()
        .filter(|s| s.id != video_id)
        .collect();
    Ok(songs)
}

/// Highest-bitrate audio yt-dlp can find. For non-Premium YouTube this is
/// opus itag 251 (~160 kbps VBR); higher (256 kbps AAC) needs an
/// authenticated Premium account. WebView2 (Chromium) plays opus/webm + m4a.
const AUDIO_FORMAT: &str = "bestaudio/best";

/// Resolve a videoId to a direct, playable audio stream URL.
pub async fn resolve_stream(app: &AppHandle, video_id: &str) -> Result<String, String> {
    let url = format!("https://www.youtube.com/watch?v={video_id}");
    let (stdout, stderr) = run_ytdlp(
        app,
        vec![
            "-f".into(),
            AUDIO_FORMAT.into(),
            "-g".into(),
            "--no-warnings".into(),
            url,
        ],
    )
    .await?;

    match stdout.lines().map(str::trim).find(|l| !l.is_empty()) {
        Some(u) => Ok(u.to_string()),
        None => Err(format!(
            "no se pudo resolver el audio{}",
            if stderr.trim().is_empty() {
                String::new()
            } else {
                format!(": {}", stderr.trim())
            }
        )),
    }
}

/// Download a track's best audio to the app data dir. Returns the file path.
/// No transcoding (no ffmpeg needed) — saves the native audio container.
pub async fn download(app: &AppHandle, video_id: &str) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no se pudo obtener el directorio de datos: {e}"))?
        .join("downloads");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("no se pudo crear la carpeta de descargas: {e}"))?;

    let template = dir.join("%(id)s.%(ext)s");
    let url = format!("https://www.youtube.com/watch?v={video_id}");
    let (stdout, stderr) = run_ytdlp(
        app,
        vec![
            "-f".into(),
            AUDIO_FORMAT.into(),
            "-o".into(),
            template.to_string_lossy().into_owned(),
            "--no-simulate".into(),
            "--print".into(),
            "after_move:filepath".into(),
            "--no-warnings".into(),
            url,
        ],
    )
    .await?;

    match stdout.lines().map(str::trim).find(|l| !l.is_empty()) {
        Some(p) => Ok(p.to_string()),
        None => Err(format!(
            "no se pudo descargar{}",
            if stderr.trim().is_empty() {
                String::new()
            } else {
                format!(": {}", stderr.trim())
            }
        )),
    }
}
