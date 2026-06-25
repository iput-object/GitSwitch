//! Small cross-platform path helpers.

use std::path::PathBuf;
use std::process::Command;

/// Build a `Command` that never flashes a console window on Windows. Every
/// subprocess (git, ssh, ssh-keygen) must go through this — a bare
/// `Command::new` pops a CMD window on each call in a GUI app.
pub fn command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    cmd
}

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
