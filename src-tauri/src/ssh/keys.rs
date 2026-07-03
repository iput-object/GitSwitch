use crate::paths::command;
use crate::ssh::fs::{expand_path, is_staged, move_file, set_mode, ssh_dir, staged_key_path, stamp};
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedKey {
    pub key_path: String,
    pub public_key: String,
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

// `(async)` runs this off the main thread (ssh-keygen subprocess).
#[tauri::command(async)]
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
// `(async)` runs this off the main thread (file moves + permission changes).
#[tauri::command(async)]
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
        "key".into()
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
