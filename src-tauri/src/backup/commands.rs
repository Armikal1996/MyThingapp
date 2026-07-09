use crate::backup::{pick_backup_file, read_backup_file, save_backup_dialog};

#[tauri::command]
pub fn export_backup_file(
    app: tauri::AppHandle,
    payload: String,
) -> Result<Option<String>, String> {
    save_backup_dialog(&app, &payload)
}

#[tauri::command]
pub fn pick_and_read_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    match pick_backup_file(&app)? {
        Some(path) => Ok(Some(read_backup_file(&path)?)),
        None => Ok(None),
    }
}
