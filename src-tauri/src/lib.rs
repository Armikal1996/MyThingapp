mod backup;
mod launcher;
mod lmstudio;

use backup::{export_backup_file, export_backup_to_folder, pick_and_read_backup};
use lmstudio::{lmstudio_chat_completion, lmstudio_chat_stream, lmstudio_list_models};
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
        Migration {
            version: 4,
            description: "favorites_panel",
            sql: include_str!("../../data/migrations/004_favorites_panel.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "calendar_reminders",
            sql: include_str!("../../data/migrations/005_calendar_reminders.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "media",
            sql: include_str!("../../data/migrations/006_media.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "ai_chat",
            sql: include_str!("../../data/migrations/007_ai_chat.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "integrations",
            sql: include_str!("../../data/migrations/008_integrations.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mything.db", migrations)
                .build(),
        )
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

                let handle = app.handle().clone();
                let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyM);
                app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("window.location.hash = '#/favorites'");
                        }
                        let _ = handle;
                    }
                })?;
            }

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
            export_backup_to_folder,
            pick_and_read_backup,
            lmstudio_list_models,
            lmstudio_chat_completion,
            lmstudio_chat_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "name": "MyThing",
        "phase": 7,
        "version": env!("CARGO_PKG_VERSION")
    })
}
