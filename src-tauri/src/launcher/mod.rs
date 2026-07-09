use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredProject {
    pub folder_name: String,
    pub root_path: String,
    pub runtime: String,
    pub suggested_install: Option<String>,
    pub suggested_start: Option<String>,
}

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    "target",
    ".idea",
    ".vscode",
    ".cursor",
];

pub fn default_work_folder() -> PathBuf {
    dirs::desktop_dir()
        .unwrap_or_else(|| PathBuf::from("C:/Users"))
        .join("WOrK")
}

pub fn scan_work_folder(work_folder: &str) -> Result<Vec<DiscoveredProject>, String> {
    let root = Path::new(work_folder);
    if !root.is_dir() {
        return Err(format!("WOrK folder not found: {work_folder}"));
    }

    let entries = fs::read_dir(root).map_err(|e| e.to_string())?;
    let mut projects = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder_name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        if folder_name.starts_with('.') || SKIP_DIRS.contains(&folder_name.as_str()) {
            continue;
        }

        if let Some(project) = detect_project(&folder_name, &path) {
            projects.push(project);
        }
    }

    projects.sort_by(|a, b| a.folder_name.to_lowercase().cmp(&b.folder_name.to_lowercase()));
    Ok(projects)
}

fn detect_project(folder_name: &str, path: &Path) -> Option<DiscoveredProject> {
    let package_json = path.join("package.json");
    let requirements = path.join("requirements.txt");
    let pyproject = path.join("pyproject.toml");
    let main_py = path.join("main.py");
    let app_py = path.join("app.py");

    if package_json.is_file() {
        let (install, start) = suggest_node_commands(&package_json);
        return Some(DiscoveredProject {
            folder_name: folder_name.to_string(),
            root_path: path.to_string_lossy().to_string(),
            runtime: "node".to_string(),
            suggested_install: Some(install),
            suggested_start: Some(start),
        });
    }

    if pyproject.is_file() || requirements.is_file() || main_py.is_file() || app_py.is_file() {
        let start = if main_py.is_file() {
            "python main.py".to_string()
        } else if app_py.is_file() {
            "python app.py".to_string()
        } else {
            "python .".to_string()
        };

        let install = if requirements.is_file() {
            Some("pip install -r requirements.txt".to_string())
        } else {
            None
        };

        return Some(DiscoveredProject {
            folder_name: folder_name.to_string(),
            root_path: path.to_string_lossy().to_string(),
            runtime: "python".to_string(),
            suggested_install: install,
            suggested_start: Some(start),
        });
    }

    // Include folders that look like project roots (have common entry files)
    let has_html = path.join("index.html").is_file();
    let has_cargo = path.join("Cargo.toml").is_file();
    if has_html || has_cargo {
        return Some(DiscoveredProject {
            folder_name: folder_name.to_string(),
            root_path: path.to_string_lossy().to_string(),
            runtime: if has_cargo { "rust".to_string() } else { "other".to_string() },
            suggested_install: if has_cargo {
                Some("cargo build".to_string())
            } else {
                None
            },
            suggested_start: if has_cargo {
                Some("cargo run".to_string())
            } else {
                None
            },
        });
    }

    None
}

fn suggest_node_commands(package_json: &Path) -> (String, String) {
    let install = "npm install".to_string();
    let start = fs::read_to_string(package_json)
        .ok()
        .and_then(|content| {
            let value: serde_json::Value = serde_json::from_str(&content).ok()?;
            let scripts = value.get("scripts")?.as_object()?;
            for key in ["dev", "start", "serve", "preview"] {
                if scripts.contains_key(key) {
                    return Some(format!("npm run {key}"));
                }
            }
            None
        })
        .unwrap_or_else(|| "npm run dev".to_string());

    (install, start)
}

pub fn run_command(working_dir: &str, command: &str, open_terminal: bool) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Command is empty".to_string());
    }

    let dir = Path::new(working_dir);
    if !dir.is_dir() {
        return Err(format!("Project folder not found: {working_dir}"));
    }

    #[cfg(target_os = "windows")]
    {
        if open_terminal {
            let script = format!("cd /d \"{working_dir}\" && {command}");
            Command::new("cmd")
                .args(["/C", "start", "", "cmd", "/K", &script])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("cmd")
                .args(["/C", command])
                .current_dir(working_dir)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        if open_terminal {
            Command::new("x-terminal-emulator")
                .args(["-e", "bash", "-lc", &format!("cd \"{working_dir}\" && {command}; exec bash")])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("sh")
                .args(["-c", command])
                .current_dir(working_dir)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

pub fn open_in_explorer(path: &str) -> Result<(), String> {
    let target = Path::new(path);
    if !target.exists() {
        return Err(format!("Path not found: {path}"));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub mod commands;
pub use commands::*;
