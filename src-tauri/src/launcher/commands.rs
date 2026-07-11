use crate::launcher::{default_work_folder, open_in_explorer, run_command, scan_work_folder};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn get_default_work_folder() -> String {
    default_work_folder()
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
pub fn scan_work_folder_cmd(work_folder: String) -> Result<serde_json::Value, String> {
    let projects = scan_work_folder(&work_folder)?;
    Ok(serde_json::json!(projects))
}

#[tauri::command]
pub fn run_app_command(
    working_dir: String,
    command: String,
    open_terminal: bool,
) -> Result<(), String> {
    run_command(&working_dir, &command, open_terminal)
}

#[tauri::command]
pub fn open_app_folder(path: String) -> Result<(), String> {
    open_in_explorer(&path)
}

#[tauri::command]
pub fn open_with_cursor(path: String) -> Result<(), String> {
    super::open_in_cursor(&path)
}

#[tauri::command]
pub async fn pick_project_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app
        .dialog()
        .file()
        .set_title("Select project folder")
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn pick_work_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app
        .dialog()
        .file()
        .set_title("Select WOrK folder")
        .blocking_pick_folder();

    Ok(path.map(|p| p.to_string()))
}
