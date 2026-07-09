use crate::backup::{backup_timestamp, pick_backup_file, read_backup_file, save_backup_dialog, write_backup_file};
use std::path::PathBuf;

#[tauri::command]
pub fn export_backup_file(
    app: tauri::AppHandle,
    payload: String,
) -> Result<Option<String>, String> {
    save_backup_dialog(&app, &payload)
}

#[tauri::command]
pub fn export_backup_to_folder(folder: String, payload: String) -> Result<String, String> {
    let dir = PathBuf::from(&folder);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let filename = format!("mything-backup-{}.json", backup_timestamp());
    let path = dir.join(filename);
    let dest = path.to_string_lossy().to_string();
    write_backup_file(&dest, &payload)?;
    Ok(dest)
}

#[tauri::command]
pub fn pick_and_read_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    match pick_backup_file(&app)? {
        Some(path) => Ok(Some(read_backup_file(&path)?)),
        None => Ok(None),
    }
}
