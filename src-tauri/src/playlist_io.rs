//! Lectura/escritura de archivos de texto en disco para export/import de
//! playlists. El formato JSON se construye en el frontend (TypeScript); aquí
//! solo tocamos el disco con `std::fs`, evitando el scope de tauri-plugin-fs.

use std::fs;

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("No se pudo escribir el archivo: {e}"))
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el archivo: {e}"))
}
