use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_dialog::DialogExt;

pub fn backup_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

pub fn write_backup_file(path: &str, payload: &str) -> Result<(), String> {
    fs::write(path, payload.as_bytes()).map_err(|e| e.to_string())
}

pub fn read_backup_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn save_backup_dialog(app: &tauri::AppHandle, payload: &str) -> Result<Option<String>, String> {
    let filename = format!("mything-backup-{}.json", backup_timestamp());
    let path = app
        .dialog()
        .file()
        .set_title("Save MyThing backup")
        .add_filter("MyThing Backup", &["json"])
        .set_file_name(&filename)
        .blocking_save_file();

    match path {
        Some(file_path) => {
            let dest = file_path.to_string();
            write_backup_file(&dest, payload)?;
            Ok(Some(dest))
        }
        None => Ok(None),
    }
}

pub fn pick_backup_file(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app
        .dialog()
        .file()
        .set_title("Select MyThing backup")
        .add_filter("MyThing Backup", &["json"])
        .blocking_pick_file();

    Ok(path.map(|p| p.to_string()))
}

pub mod commands;
pub use commands::*;
