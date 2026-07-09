mod backup;
mod launcher;

use backup::{export_backup_file, pick_and_read_backup};
use launcher::{
    get_default_work_folder, open_app_folder, pick_project_folder, pick_work_folder,
    run_app_command, scan_work_folder_cmd,
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial_schema",
            sql: include_str!("../../data/schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "launcher_apps",
            sql: include_str!("../../data/migrations/002_launcher_apps.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "tasks_and_backup",
            sql: include_str!("../../data/migrations/003_tasks_and_backup.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mything.db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_platform_info,
            get_default_work_folder,
            scan_work_folder_cmd,
            run_app_command,
            open_app_folder,
            pick_project_folder,
            pick_work_folder,
            export_backup_file,
            pick_and_read_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "name": "MyThing",
        "phase": 2,
        "version": env!("CARGO_PKG_VERSION")
    })
}
