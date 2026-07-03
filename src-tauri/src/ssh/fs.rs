use crate::paths;
use std::path::{Path, PathBuf};

#[cfg(unix)]
pub(crate) fn set_mode(path: &Path, mode: u32) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode));
}
#[cfg(not(unix))]
pub(crate) fn set_mode(_path: &Path, _mode: u32) {}

pub fn ssh_dir() -> Result<PathBuf, String> {
    let home = paths::home().ok_or_else(|| "Could not find your home directory".to_string())?;
    let dir = home.join(".ssh");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create ~/.ssh: {e}"))?;
        set_mode(&dir, 0o700);
    }
    Ok(dir)
}

pub(crate) fn stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{n:x}")
}

/// A scratch directory for keys that have NOT been saved yet. Nothing lands in
/// ~/.ssh until the account is committed, so abandoned attempts leave it clean.
pub(crate) fn staging_dir() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("gitswitch-keys");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create temp dir: {e}"))?;
        set_mode(&dir, 0o700);
    }
    Ok(dir)
}

/// A fresh, collision-free private-key path inside the staging dir.
pub(crate) fn staged_key_path() -> Result<PathBuf, String> {
    Ok(staging_dir()?.join(format!("gitswitch_{}", stamp())))
}

/// Is this path one of our staged (not-yet-saved) keys?
pub(crate) fn is_staged(path: &Path) -> bool {
    staging_dir()
        .map(|dir| path.starts_with(&dir))
        .unwrap_or(false)
}

pub(crate) fn move_file(src: &Path, dest: &Path) -> Result<(), String> {
    // rename fails across filesystems (temp -> home), so fall back to copy.
    if std::fs::rename(src, dest).is_ok() {
        return Ok(());
    }
    std::fs::copy(src, dest).map_err(|e| format!("Could not write key: {e}"))?;
    let _ = std::fs::remove_file(src);
    Ok(())
}

pub fn expand_path(input: &str) -> PathBuf {
    let trimmed = input.trim();
    if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = paths::home() {
            return home.join(rest);
        }
    }
    PathBuf::from(trimmed)
}
