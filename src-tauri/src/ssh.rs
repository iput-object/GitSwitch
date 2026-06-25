//! SSH key handling: generating keypairs, turning the single input field into
//! a usable private-key path, and asking GitHub which account a key belongs to.

use crate::paths;
use serde::Serialize;
use crate::paths::command;
use std::path::{Path, PathBuf};

const MANAGED_BEGIN: &str = "# >>> GitSwitch managed block";
const MANAGED_END: &str = "# <<< GitSwitch managed block";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedKey {
    pub key_path: String,
    pub public_key: String,
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode));
}
#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: u32) {}

fn ssh_dir() -> Result<PathBuf, String> {
    let home = paths::home().ok_or_else(|| "Could not find your home directory".to_string())?;
    let dir = home.join(".ssh");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create ~/.ssh: {e}"))?;
        set_mode(&dir, 0o700);
    }
    Ok(dir)
}

#[tauri::command]
pub fn open_ssh_folder(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let dir = ssh_dir()?;
    app.opener()
        .open_path(dir.to_string_lossy().into_owned(), None::<String>)
        .map_err(|e| format!("Could not open folder: {e}"))
}

fn stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{n:x}")
}

/// A scratch directory for keys that have NOT been saved yet. Nothing lands in
/// ~/.ssh until the account is committed, so abandoned attempts leave it clean.
fn staging_dir() -> Result<PathBuf, String> {
    let dir = std::env::temp_dir().join("gitswitch-keys");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create temp dir: {e}"))?;
        set_mode(&dir, 0o700);
    }
    Ok(dir)
}

/// A fresh, collision-free private-key path inside the staging dir.
fn staged_key_path() -> Result<PathBuf, String> {
    Ok(staging_dir()?.join(format!("gitswitch_{}", stamp())))
}

/// Is this path one of our staged (not-yet-saved) keys?
fn is_staged(path: &Path) -> bool {
    staging_dir()
        .map(|dir| path.starts_with(&dir))
        .unwrap_or(false)
}

fn move_file(src: &Path, dest: &Path) -> Result<(), String> {
    // rename fails across filesystems (temp -> home), so fall back to copy.
    if std::fs::rename(src, dest).is_ok() {
        return Ok(());
    }
    std::fs::copy(src, dest).map_err(|e| format!("Could not write key: {e}"))?;
    let _ = std::fs::remove_file(src);
    Ok(())
}

/// The private key currently mapped to github.com in ~/.ssh/config, if any.
/// Lets us see which identity is in use even after manual edits.
pub fn current_github_key() -> Option<PathBuf> {
    let home = paths::home()?;
    let text = std::fs::read_to_string(home.join(".ssh").join("config")).ok()?;

    let mut in_github_block = false;
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut parts = line.splitn(2, char::is_whitespace);
        let keyword = parts.next().unwrap_or("").to_ascii_lowercase();
        let value = parts.next().unwrap_or("").trim();

        if keyword == "host" {
            in_github_block = value.split_whitespace().any(|p| p.contains("github.com"));
        } else if in_github_block && keyword == "identityfile" {
            return Some(expand_path(value.trim_matches('"')));
        }
    }
    None
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

/// Read `<key>.pub`, or derive the public key from the private key if needed.
pub fn read_public_key(private_path: &Path) -> String {
    let pub_path = format!("{}.pub", private_path.display());
    if let Ok(s) = std::fs::read_to_string(&pub_path) {
        return s.trim().to_string();
    }
    if let Ok(out) = command("ssh-keygen")
        .arg("-y")
        .arg("-f")
        .arg(private_path)
        .output()
    {
        if out.status.success() {
            return String::from_utf8_lossy(&out.stdout).trim().to_string();
        }
    }
    String::new()
}

#[tauri::command]
pub fn generate_ssh_key() -> Result<GeneratedKey, String> {
    // Generated into staging, not ~/.ssh. It only moves home on save.
    let key_path = staged_key_path()?;
    let output = command("ssh-keygen")
        .args(["-t", "ed25519", "-N", "", "-C", "gitswitch", "-f"])
        .arg(&key_path)
        .output()
        .map_err(|e| format!("Could not run ssh-keygen: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "ssh-keygen failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    set_mode(&key_path, 0o600);
    let public_key = read_public_key(&key_path);
    Ok(GeneratedKey {
        key_path: key_path.to_string_lossy().into_owned(),
        public_key,
    })
}

/// Resolve the single input field into a usable private-key file path, plus
/// whether GitSwitch owns it (`managed` = staged, must move into ~/.ssh on save;
/// an existing user path is used in place and never copied).
pub fn resolve_key_input(input: &str) -> Result<(PathBuf, bool), String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Add a key path or paste a private key first.".to_string());
    }
    if trimmed.contains("PRIVATE KEY") {
        // Pasted key material: stage it for the SSH probe, save later.
        let key_path = staged_key_path()?;
        let mut body = trimmed.to_string();
        if !body.ends_with('\n') {
            body.push('\n');
        }
        std::fs::write(&key_path, body).map_err(|e| format!("Could not save the key: {e}"))?;
        set_mode(&key_path, 0o600);
        return Ok((key_path, true));
    }
    let path = expand_path(trimmed);
    if !path.exists() {
        return Err(format!("No key file found at {}", path.display()));
    }
    // A path pointing back into staging (e.g. a key we just generated) is ours.
    let managed = is_staged(&path);
    Ok((path, managed))
}

/// Move a staged key into ~/.ssh under a stable, login-based name and return
/// the final path. Called only when the account is saved.
#[tauri::command]
pub fn commit_key(key_path: String, login: String) -> Result<String, String> {
    let src = PathBuf::from(&key_path);
    if !src.exists() {
        return Err("The key file is missing.".to_string());
    }
    let dir = ssh_dir()?;
    let safe: String = login
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let base = if safe.is_empty() {
        "github".into()
    } else {
        safe
    };

    let mut dest = dir.join(format!("gitswitch_{base}"));
    if dest.exists() {
        dest = dir.join(format!("gitswitch_{base}_{}", stamp()));
    }

    move_file(&src, &dest)?;
    set_mode(&dest, 0o600);

    // Bring the public key along, deriving it if there was no .pub file.
    let src_pub = PathBuf::from(format!("{key_path}.pub"));
    let dest_pub = PathBuf::from(format!("{}.pub", dest.display()));
    if src_pub.exists() {
        let _ = move_file(&src_pub, &dest_pub);
    } else {
        let pubkey = read_public_key(&dest);
        if !pubkey.is_empty() {
            let _ = std::fs::write(&dest_pub, format!("{pubkey}\n"));
        }
    }

    Ok(dest.to_string_lossy().into_owned())
}

/// Ask GitHub who this key belongs to. `ssh -T git@github.com` exits non-zero
/// even on success, so we parse the `Hi <login>!` banner from its output.
pub fn ssh_identify(key_path: &Path) -> Result<String, String> {
    let output = command("ssh")
        // Ignore the user's ~/.ssh/config and ssh-agent so we test ONLY the key
        // passed here. Otherwise an existing github.com config entry would
        // authenticate on its own and report the wrong (ambient) account.
        .arg("-F")
        .arg(paths::null_device())
        .arg("-i")
        .arg(key_path)
        .args([
            "-o",
            "IdentitiesOnly=yes",
            "-o",
            "IdentityAgent=none",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            "-T",
            "git@github.com",
        ])
        .output()
        .map_err(|e| format!("Could not run ssh: {e}"))?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    if let Some(after) = text.split("Hi ").nth(1) {
        if let Some(login) = after.split('!').next() {
            let login = login.trim();
            if !login.is_empty() {
                return Ok(login.to_string());
            }
        }
    }
    if text.contains("Permission denied") {
        return Err("GitHub did not recognize this key yet. Add the public key to your GitHub account, then sync again.".to_string());
    }
    Err(format!(
        "Could not verify the key with GitHub.\n{}",
        text.trim()
    ))
}

/// Health-check a saved profile's key. Network call (a few seconds) — call it
/// off the startup load path, never inline. Returns:
///   "ok"      — key file is present and authenticates with GitHub as `login`.
///   "broken"  — file is gone, GitHub rejected the key, or it now belongs to a
///               different account. The profile will not work as-is.
///   "unknown" — could not reach GitHub. Don't flag the profile on this alone.
#[tauri::command]
pub fn check_profile(key_path: String, login: String) -> &'static str {
    let path = expand_path(&key_path);
    if !path.exists() {
        return "broken";
    }
    match ssh_identify(&path) {
        Ok(who) if who.eq_ignore_ascii_case(login.trim()) => "ok",
        Ok(_) => "broken",                                          // wrong account
        Err(e) if e.contains("did not recognize this key") => "broken", // removed from GitHub
        Err(_) => "unknown",                                       // network/other
    }
}

/// Remove the GitSwitch-managed block (between markers), leaving everything
/// else in the file untouched.
fn strip_managed_block(text: &str) -> String {
    let lines: Vec<&str> = text.lines().collect();
    let begin = lines.iter().position(|l| l.trim() == MANAGED_BEGIN);
    let end = lines.iter().position(|l| l.trim() == MANAGED_END);
    if let (Some(b), Some(e)) = (begin, end) {
        if e >= b {
            let mut kept: Vec<&str> = lines[..b].to_vec();
            if e + 1 < lines.len() {
                kept.extend_from_slice(&lines[e + 1..]);
            }
            return kept.join("\n");
        }
    }
    text.to_string()
}

/// Comment out any existing `Host github.com` block (outside our managed block)
/// so it cannot merge with and corrupt ours. A block runs from its `Host`/`Match`
/// line to the next one. Other aliases (e.g. `github.com-lazy`) are left alone.
fn comment_conflicting_github(text: &str) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut in_conflict = false;

    for raw in text.lines() {
        let trimmed = raw.trim_start();
        let lower = trimmed.to_ascii_lowercase();
        let is_host = lower == "host" || lower.starts_with("host ");
        let is_match = lower == "match" || lower.starts_with("match ");

        if is_host || is_match {
            // A block boundary: this block conflicts only if it's a plain
            // `Host` whose patterns include exactly `github.com`.
            in_conflict = is_host
                && trimmed
                    .split_whitespace()
                    .skip(1)
                    .any(|pattern| pattern == "github.com");
        }

        if in_conflict && !trimmed.is_empty() && !trimmed.starts_with('#') {
            out.push(format!("# {raw}"));
        } else {
            out.push(raw.to_string());
        }
    }
    out.join("\n")
}

/// Point github.com at `key_path` by rewriting only our managed block in
/// ~/.ssh/config. The block goes first so it wins (ssh takes the first value
/// per parameter), any conflicting github.com block is commented out, and all
/// other config is preserved exactly.
pub fn apply_ssh_config(key_path: &str) -> Result<(), String> {
    let config = ssh_dir()?.join("config");
    let existing = std::fs::read_to_string(&config).unwrap_or_default();
    let preserved = comment_conflicting_github(&strip_managed_block(&existing));

    let block = format!(
        "{MANAGED_BEGIN}\n\
         # Managed by GitSwitch. Edits inside this block are overwritten on switch.\n\
         Host github.com\n    \
         HostName github.com\n    \
         User git\n    \
         IdentityFile {key_path}\n    \
         IdentitiesOnly yes\n\
         {MANAGED_END}\n"
    );

    let mut content = block;
    let rest = preserved.trim();
    if !rest.is_empty() {
        content.push('\n');
        content.push_str(rest);
        content.push('\n');
    }

    std::fs::write(&config, content).map_err(|e| format!("Could not write ~/.ssh/config: {e}"))?;
    set_mode(&config, 0o600);
    Ok(())
}
