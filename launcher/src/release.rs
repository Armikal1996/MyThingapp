use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn main() -> ExitCode {
    let project_root = project_root();
    let exe = find_mything_exe(&project_root);

    let Some(exe) = exe else {
        return fail(
            "MyThing desktop app not found.\n\
             Build it first: npm run tauri:build\n\
             Expected: src-tauri/target/release/mything.exe",
        );
    };

    match launch(&exe) {
        Ok(status) if status.success() => ExitCode::SUCCESS,
        Ok(status) => ExitCode::from(status.code().unwrap_or(1) as u8),
        Err(e) => fail(&format!("Failed to start MyThing: {e}")),
    }
}

fn project_root() -> PathBuf {
    env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn find_mything_exe(project_root: &Path) -> Option<PathBuf> {
    let candidates = [
        project_root.join("src-tauri").join("target").join("release").join("mything.exe"),
        project_root.join("src-tauri").join("target").join("release").join("MyThing.exe"),
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

fn launch(exe: &Path) -> Result<std::process::ExitStatus, std::io::Error> {
    let mut command = Command::new(exe);
    command.stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    command.status()
}

fn fail(message: &str) -> ExitCode {
    eprintln!("\n{message}");
    eprintln!("\nPress Enter to close…");
    let mut line = String::new();
    let _ = std::io::stdin().read_line(&mut line);
    ExitCode::FAILURE
}
