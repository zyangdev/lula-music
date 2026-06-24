//! Lectura/escritura de archivos de texto para export/import de playlists.
//! El formato JSON se construye en el frontend (TypeScript); aquí solo tocamos
//! el archivo elegido en el diálogo.
//!
//! En escritorio el diálogo devuelve una ruta normal → `std::fs`. En Android
//! devuelve un `content://` URI (SAF) que `std::fs` no puede abrir, así que se
//! lee/escribe a través del plugin Kotlin (ContentResolver).

#[tauri::command]
pub async fn write_text_file(
    app: tauri::AppHandle,
    path: String,
    contents: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        return tauri::async_runtime::spawn_blocking(move || {
            crate::ytmobile::write_text_file(&app, &path, &contents)
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = &app;
        std::fs::write(&path, contents).map_err(|e| format!("No se pudo escribir el archivo: {e}"))
    }
}

#[tauri::command]
pub async fn read_text_file(app: tauri::AppHandle, path: String) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        return tauri::async_runtime::spawn_blocking(move || {
            crate::ytmobile::read_text_file(&app, &path)
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = &app;
        std::fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el archivo: {e}"))
    }
}
