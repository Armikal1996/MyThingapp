use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode, Stdio};

fn main() -> ExitCode {
    let project_root = project_root();
    let cargo_bin = cargo_bin_dir();

    if let Some(dir) = &cargo_bin {
        prepend_path(dir);
        println!("Cargo PATH ready: {}", dir.display());
    } else {
        eprintln!("Warning: Cargo bin folder not found. Install Rust from https://rustup.rs");
    }

    if !command_exists("node") {
        return fail("Node.js not found. Install Node 18+ and try again.");
    }
    if !command_exists("npm") {
        return fail("npm not found. Install Node.js and try again.");
    }
    if !command_exists("cargo") {
        return fail("cargo not found. Install Rust or fix your PATH.");
    }

    println!("Starting MyThing from {}\n", project_root.display());

    if !project_root.join("node_modules").is_dir() {
        println!("Installing npm dependencies…");
        let status = Command::new("npm")
            .arg("install")
            .current_dir(&project_root)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status();

        match status {
            Ok(s) if s.success() => {}
            _ => return fail("npm install failed."),
        }
    }

    let status = Command::new("npm")
        .args(["run", "tauri:dev"])
        .current_dir(&project_root)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status();

    match status {
        Ok(s) if s.success() => ExitCode::SUCCESS,
        Ok(s) => {
            let code = s.code().unwrap_or(1);
            pause_on_error(code);
            ExitCode::from(code as u8)
        }
        Err(e) => fail(&format!("Failed to start npm: {e}")),
    }
}

fn project_root() -> PathBuf {
    env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn cargo_bin_dir() -> Option<PathBuf> {
    let home = env::var("USERPROFILE").ok()?;
    let dir = PathBuf::from(home).join(".cargo").join("bin");
    if dir.is_dir() { Some(dir) } else { None }
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
    Command::new("where")
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
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
