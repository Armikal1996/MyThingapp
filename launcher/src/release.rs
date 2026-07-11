use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};

fn main() -> ExitCode {
    let project_root = find_project_root();
    let exe = find_mything_exe(&project_root);

    let Some(exe) = exe else {
        return fail(
            "MyThing desktop app not found.\n\
             Build it first from the project folder:\n\
             npm run tauri:build\n\
             npm run launcher:build:release",
        );
    };

    match launch(&exe) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => fail(&format!("Failed to start MyThing: {e}")),
    }
}

fn find_project_root() -> PathBuf {
    let start = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let mut dir = start.clone();
    for _ in 0..6 {
        if dir.join("package.json").is_file() && dir.join("src-tauri").is_dir() {
            return dir;
        }
        if !dir.pop() {
            break;
        }
    }
    start
}

fn find_mything_exe(project_root: &Path) -> Option<PathBuf> {
    let candidates = [
        project_root
            .join("src-tauri")
            .join("target")
            .join("release")
            .join("mything.exe"),
        project_root
            .join("src-tauri")
            .join("target")
            .join("release")
            .join("MyThing.exe"),
        project_root
            .join("src-tauri")
            .join("target")
            .join("debug")
            .join("mything.exe"),
        local_app_data_exe(),
    ];

    candidates.into_iter().find(|p| p.is_file())
}

fn local_app_data_exe() -> PathBuf {
    let base = env::var("LOCALAPPDATA").unwrap_or_default();
    PathBuf::from(base)
        .join("com.mything.desktop")
        .join("MyThing.exe")
}

fn launch(exe: &Path) -> Result<(), std::io::Error> {
    Command::new(exe)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;
    Ok(())
}

fn fail(message: &str) -> ExitCode {
    eprintln!("\n{message}");
    eprintln!("\nPress Enter to close…");
    let mut line = String::new();
    let _ = std::io::stdin().read_line(&mut line);
    ExitCode::FAILURE
}
