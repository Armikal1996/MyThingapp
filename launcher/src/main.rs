use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};

fn main() -> ExitCode {
    let project_root = find_project_root();
    refresh_path();

    // Prefer a built desktop binary — no browser preview, no dev server.
    if let Some(exe) = find_mything_exe(&project_root) {
        println!("Starting MyThing desktop app…\n{}", exe.display());
        match launch_desktop(&exe) {
            Ok(()) => return ExitCode::SUCCESS,
            Err(e) => eprintln!("Failed to launch desktop app: {e}\nFalling back to dev mode…\n"),
        }
    }

    if let Some(dir) = cargo_bin_dir() {
        prepend_path(&dir);
        println!("Cargo PATH ready: {}", dir.display());
    } else {
        eprintln!("Warning: Cargo bin folder not found. Install Rust from https://rustup.rs");
    }

    if let Some(dir) = node_bin_dir() {
        prepend_path(&dir);
        println!("Node PATH ready: {}", dir.display());
    }

    if !command_exists("node") {
        return fail(
            "Node.js not found.\n\
             Install Node 18+ from https://nodejs.org and reopen this launcher.\n\
             (Double-click apps get a shorter PATH than your terminal.)",
        );
    }
    if !command_exists("npm") {
        return fail(
            "npm not found.\n\
             Reinstall Node.js or add its folder to your user PATH, then reopen this launcher.",
        );
    }
    if !command_exists("cargo") {
        return fail("cargo not found. Install Rust or fix your PATH.");
    }

    println!("Starting MyThing dev mode from {}\n", project_root.display());

    if !project_root.join("node_modules").is_dir() {
        println!("Installing npm dependencies…");
        match run_npm(&project_root, &["install"]) {
            Ok(status) if status.success() => {}
            _ => return fail("npm install failed."),
        }
    }

    match run_npm(&project_root, &["run", "tauri:dev"]) {
        Ok(status) if status.success() => ExitCode::SUCCESS,
        Ok(status) => {
            let code = status.code().unwrap_or(1);
            pause_on_error(code);
            ExitCode::from(code as u8)
        }
        Err(e) => fail(&format!("Failed to start npm: {e}")),
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
    ];

    candidates.into_iter().find(|p| p.is_file())
}

fn launch_desktop(exe: &Path) -> Result<(), std::io::Error> {
    Command::new(exe)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;
    Ok(())
}

fn refresh_path() {
    #[cfg(windows)]
    {
        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
        {
            let merged = String::from_utf8_lossy(&output.stdout)
                .trim()
                .trim_end_matches(';')
                .to_string();
            if !merged.is_empty() {
                env::set_var("Path", merged);
            }
        }
    }
}

fn cargo_bin_dir() -> Option<PathBuf> {
    let home = env::var("USERPROFILE").ok()?;
    let dir = PathBuf::from(home).join(".cargo").join("bin");
    if dir.is_dir() { Some(dir) } else { None }
}

fn node_bin_dir() -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(program_files) = env::var("ProgramFiles") {
        candidates.push(PathBuf::from(program_files).join("nodejs"));
    }
    if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
        candidates.push(PathBuf::from(program_files_x86).join("nodejs"));
    }
    if let Ok(appdata) = env::var("APPDATA") {
        candidates.push(PathBuf::from(appdata).join("npm"));
    }
    if let Ok(localappdata) = env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(localappdata).join("Programs").join("nodejs"));
    }
    if let Ok(nvm_home) = env::var("NVM_HOME") {
        candidates.push(PathBuf::from(nvm_home));
        if let Ok(nvm_symlink) = env::var("NVM_SYMLINK") {
            candidates.push(PathBuf::from(nvm_symlink));
        }
    }

    candidates.into_iter().find(|dir| dir.join("npm.cmd").is_file() || dir.join("node.exe").is_file())
}

fn prepend_path(dir: &Path) {
    let dir_str = dir.to_string_lossy();
    let path = env::var("Path").unwrap_or_default();
    if !path
        .split(';')
        .any(|entry| entry.eq_ignore_ascii_case(dir_str.as_ref()))
    {
        env::set_var("Path", format!("{};{}", dir_str, path));
    }
}

fn command_exists(name: &str) -> bool {
    find_executable(name).is_some()
}

fn find_executable(name: &str) -> Option<PathBuf> {
    if let Ok(path) = env::var("Path") {
        let exts = env::var("PATHEXT").unwrap_or_else(|_| {
            ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC".to_string()
        });
        for dir in path.split(';') {
            let dir = dir.trim();
            if dir.is_empty() {
                continue;
            }
            let base = Path::new(dir).join(name);
            if base.is_file() {
                return Some(base);
            }
            for ext in exts.split(';') {
                let candidate = base.with_extension(ext.trim_start_matches('.'));
                if candidate.is_file() {
                    return Some(candidate);
                }
                let with_ext = Path::new(dir).join(format!("{name}{ext}"));
                if with_ext.is_file() {
                    return Some(with_ext);
                }
            }
        }
    }

    Command::new("where")
        .arg(name)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| {
            String::from_utf8(o.stdout)
                .ok()
                .and_then(|s| s.lines().next().map(|line| PathBuf::from(line.trim())))
        })
        .filter(|p| p.is_file())
}

fn run_npm(project_root: &Path, args: &[&str]) -> Result<std::process::ExitStatus, std::io::Error> {
    // npm on Windows is npm.cmd — cmd /C resolves it reliably when double-clicking the exe.
    let mut command = Command::new("cmd");
    command
        .arg("/C")
        .arg("npm")
        .args(args)
        .current_dir(project_root)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    command.status()
}

fn fail(message: &str) -> ExitCode {
    eprintln!("\n{message}");
    pause_on_error(1);
    ExitCode::FAILURE
}

fn pause_on_error(code: i32) {
    if code != 0 {
        eprintln!("\nPress Enter to close…");
        let mut line = String::new();
        let _ = std::io::stdin().read_line(&mut line);
    }
}
