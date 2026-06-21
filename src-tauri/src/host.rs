//! Local machine identity: the OS account name and (where available) its
//! avatar, used to personalize the Welcome screen.

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;

#[derive(Serialize)]
pub struct HostInfo {
    /// The current OS account name (e.g. "ahad").
    username: String,
    /// The account picture as a `data:` URI, when one can be found.
    avatar: Option<String>,
}

/// Best-effort lookup of the logged-in OS account name.
fn current_username() -> String {
    std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .or_else(|_| std::env::var("LOGNAME"))
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "there".to_string())
}

/// Try to locate the OS account picture and return it as a base64 `data:` URI.
/// Only Linux exposes this reliably (`~/.face` or AccountsService); elsewhere
/// the frontend falls back to initials.
fn find_avatar(username: &str) -> Option<String> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();
    if let Some(home) = crate::paths::home() {
        candidates.push(home.join(".face"));
        candidates.push(home.join(".face.icon"));
    }
    candidates.push(format!("/var/lib/AccountsService/icons/{username}").into());

    for path in candidates {
        let Ok(bytes) = std::fs::read(&path) else {
            continue;
        };
        if bytes.is_empty() {
            continue;
        }
        let mime = if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
            "image/jpeg"
        } else {
            "image/png"
        };
        let encoded = general_purpose::STANDARD.encode(&bytes);
        return Some(format!("data:{mime};base64,{encoded}"));
    }
    None
}

#[tauri::command]
pub fn get_host_info() -> HostInfo {
    let username = current_username();
    let avatar = find_avatar(&username);
    HostInfo { username, avatar }
}
