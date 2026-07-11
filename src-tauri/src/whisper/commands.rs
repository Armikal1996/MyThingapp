use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;
use tauri::Manager;

const MODEL_FILENAME: &str = "ggml-base.en.bin";
const MODEL_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
const BINARY_ZIP_URL: &str =
    "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip";
const WHISPER_EXE: &str = "whisper-cli.exe";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperStatus {
    pub ready: bool,
    pub model_ready: bool,
    pub binary_ready: bool,
    pub model_path: Option<String>,
    pub binary_path: Option<String>,
    pub message: String,
}

fn whisper_root() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("C:/Users/Public"))
        .join("com.mything.desktop")
        .join("whisper")
}

fn model_dir() -> PathBuf {
    whisper_root().join("models")
}

fn bin_dir() -> PathBuf {
    whisper_root().join("bin")
}

fn model_path() -> PathBuf {
    model_dir().join(MODEL_FILENAME)
}

fn binary_path() -> PathBuf {
    bin_dir().join(WHISPER_EXE)
}

fn sidecar_binary_path(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    #[cfg(windows)]
    {
        let candidate =
            resource_dir.join("binaries/whisper-cli-x86_64-pc-windows-msvc.exe");
        if candidate.exists() {
            return Some(candidate);
        }
    }
    #[cfg(not(windows))]
    {
        let _ = resource_dir;
    }
    None
}

fn resolve_whisper_exe(app: &AppHandle) -> Option<PathBuf> {
    sidecar_binary_path(app)
        .filter(|p| p.exists())
        .or_else(|| {
            let local = binary_path();
            if local.exists() {
                Some(local)
            } else {
                None
            }
        })
}

async fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("Download failed ({}): {}", resp.status(), url));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(windows)]
fn extract_whisper_zip(zip_bytes: &[u8], dest_bin: &Path) -> Result<(), String> {
    use std::io::Cursor;
    let reader = Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(reader).map_err(|e| e.to_string())?;
    fs::create_dir_all(dest_bin.parent().unwrap_or(dest_bin)).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().replace('\\', "/");
        let file_name = Path::new(&name)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        if file_name == WHISPER_EXE {
            if let Some(parent) = dest_bin.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out = fs::File::create(dest_bin).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut out).map_err(|e| e.to_string())?;
        } else if file_name.ends_with(".dll") {
            let dll_dest = bin_dir().join(&file_name);
            if let Some(parent) = dll_dest.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out = fs::File::create(&dll_dest).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut out).map_err(|e| e.to_string())?;
        }
    }

    if !dest_bin.exists() {
        return Err("whisper-cli.exe not found in downloaded zip".to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn extract_whisper_zip(_zip_bytes: &[u8], _dest_bin: &Path) -> Result<(), String> {
    Err("Whisper binary download is only supported on Windows in v1".to_string())
}

async fn ensure_model() -> Result<PathBuf, String> {
    let path = model_path();
    if path.exists() {
        return Ok(path);
    }
    download_file(MODEL_URL, &path).await?;
    Ok(path)
}

async fn ensure_binary() -> Result<PathBuf, String> {
    let path = binary_path();
    if path.exists() {
        return Ok(path);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(BINARY_ZIP_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Binary download failed: {}", resp.status()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    extract_whisper_zip(&bytes, &path)?;
    Ok(path)
}

#[tauri::command]
pub async fn whisper_get_status(app: AppHandle) -> Result<WhisperStatus, String> {
    let model = model_path();
    let binary = resolve_whisper_exe(&app);
    let model_ready = model.exists();
    let binary_ready = binary.is_some();
    let ready = model_ready && binary_ready;

    let message = if ready {
        "Speech ready".to_string()
    } else if !binary_ready && !model_ready {
        "Download speech model and Whisper (~150 MB total)".to_string()
    } else if !model_ready {
        "Speech model not downloaded".to_string()
    } else {
        "Whisper binary not installed".to_string()
    };

    Ok(WhisperStatus {
        ready,
        model_ready,
        binary_ready,
        model_path: model_ready.then(|| model.to_string_lossy().to_string()),
        binary_path: binary.as_ref().map(|p| p.to_string_lossy().to_string()),
        message,
    })
}

#[tauri::command]
pub async fn whisper_ensure_ready(app: AppHandle) -> Result<WhisperStatus, String> {
    if resolve_whisper_exe(&app).is_none() {
        ensure_binary().await?;
    }
    ensure_model().await?;
    whisper_get_status(app).await
}

fn parse_transcript(stdout: &str, txt_path: &Path) -> Result<String, String> {
    if txt_path.exists() {
        let text = fs::read_to_string(txt_path).map_err(|e| e.to_string())?;
        let trimmed = text.trim().to_string();
        if !trimmed.is_empty() {
            let _ = fs::remove_file(txt_path);
            return Ok(trimmed);
        }
    }

    let mut lines = Vec::new();
    for line in stdout.lines() {
        let t = line.trim();
        if t.is_empty() {
            continue;
        }
        if t.starts_with("whisper_") || t.starts_with("system_info") || t.starts_with("main:")
            || t.contains("load time") || t.contains("fallbacks")
        {
            continue;
        }
        lines.push(t);
    }

    let text = lines.join(" ").trim().to_string();
    if text.is_empty() {
        return Err("No speech detected".to_string());
    }
    Ok(text)
}

#[tauri::command]
pub async fn whisper_transcribe(
    app: AppHandle,
    audio_base64: String,
    language: Option<String>,
) -> Result<String, String> {
    whisper_ensure_ready(app.clone()).await?;

    let exe = resolve_whisper_exe(&app).ok_or("Whisper binary not found")?;
    let model = model_path();
    if !model.exists() {
        return Err("Speech model not found".to_string());
    }

    let wav_bytes = base64::engine::general_purpose::STANDARD
        .decode(audio_base64.trim())
        .map_err(|e| format!("Invalid audio data: {e}"))?;

    if wav_bytes.len() < 1000 {
        return Err("Recording too short".to_string());
    }

    let temp_dir = std::env::temp_dir().join(format!(
        "mything-whisper-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    ));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let wav_path = temp_dir.join("input.wav");
    fs::write(&wav_path, &wav_bytes).map_err(|e| e.to_string())?;

    let lang = language.unwrap_or_else(|| "en".to_string());
    let txt_path = temp_dir.join("input.wav.txt");

    let output = Command::new(&exe)
        .current_dir(bin_dir())
        .args([
            "-m",
            model.to_string_lossy().as_ref(),
            "-f",
            wav_path.to_string_lossy().as_ref(),
            "-l",
            &lang,
            "--no-timestamps",
            "-otxt",
        ])
        .output()
        .map_err(|e| format!("Failed to run Whisper: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let result = parse_transcript(&stdout, &txt_path);

    let _ = fs::remove_dir_all(&temp_dir);

    if !output.status.success() {
        return Err(if stderr.is_empty() {
            format!("Whisper failed: {stdout}")
        } else {
            format!("Whisper failed: {stderr}")
        });
    }

    result
}
