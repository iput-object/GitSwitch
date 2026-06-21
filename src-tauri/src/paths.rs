//! Small cross-platform path helpers.

use std::path::PathBuf;

/// The user's home directory. Uses `HOME` (Linux/macOS) and falls back to
/// `USERPROFILE` (Windows).
pub fn home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .filter(|p| !p.as_os_str().is_empty())
}

/// The platform's null device, used to make `ssh` ignore the user's config.
pub fn null_device() -> &'static str {
    if cfg!(windows) {
        "NUL"
    } else {
        "/dev/null"
    }
}
