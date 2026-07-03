//! Read and write the global git identity (`user.name` / `user.email`).

use crate::paths::command;

/// Read a `git config --global <key>` value, if set and non-empty.
pub fn global(key: &str) -> Option<String> {
    let out = command("git")
        .args(["config", "--global", key])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let value = String::from_utf8_lossy(&out.stdout).trim().to_string();
    (!value.is_empty()).then_some(value)
}

/// Dump the global git config as plain text for display ("Show Git Config").
// `(async)` runs this off the main thread (git subprocess).
#[tauri::command(async)]
pub fn git_config() -> Result<String, String> {
    let out = command("git")
        .args(["config", "--global", "--list"])
        .output()
        .map_err(|e| format!("Could not run git: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "git config failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Write a `git config --global <key> <value>`.
pub fn set_global(key: &str, value: &str) -> Result<(), String> {
    let out = command("git")
        .args(["config", "--global", key, value])
        .output()
        .map_err(|e| format!("Could not run git: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "git config {key} failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(())
}
