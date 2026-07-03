use crate::paths::{command, null_device};
use crate::provider::{self, ProviderKind};
use crate::ssh::fs::expand_path;
use std::path::Path;

/// Ask a provider who this key belongs to. `ssh -T git@<host>` exits non-zero
/// even on success, so we parse the login from the greeting banner (the banner
/// format differs per provider — see `provider::parse_login`).
pub fn ssh_identify(host: &str, kind: ProviderKind, key_path: &Path) -> Result<String, String> {
    let target = format!("git@{host}");
    let output = command("ssh")
        // Ignore the user's ~/.ssh/config and ssh-agent so we test ONLY the key
        // passed here. Otherwise an existing host config entry would
        // authenticate on its own and report the wrong (ambient) account.
        .arg("-F")
        .arg(null_device())
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
            &target,
        ])
        .output()
        .map_err(|e| format!("Could not run ssh: {e}"))?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    if let Some(login) = provider::parse_login(kind, &text) {
        return Ok(login);
    }
    if text.contains("Permission denied") {
        return Err(format!(
            "{host} did not recognize this key yet. Add the public key to your account, then sync again."
        ));
    }
    Err(format!("Could not verify the key with {host}.\n{}", text.trim()))
}

/// Health-check a saved profile's key. Network call (a few seconds) — call it
/// off the startup load path, never inline. Returns:
///   "ok"      — key file is present and authenticates with the provider as `login`.
///   "broken"  — file is gone, the provider rejected the key, or it now belongs
///               to a different account. The profile will not work as-is.
///   "unknown" — could not reach the provider. Don't flag the profile on this alone.
// `(async)` runs this off the main thread (ssh round trip to the provider).
#[tauri::command(async)]
pub fn check_profile(host: String, kind: String, key_path: String, login: String) -> &'static str {
    let path = expand_path(&key_path);
    if !path.exists() {
        return "broken";
    }
    match ssh_identify(&host, ProviderKind::parse(&kind), &path) {
        Ok(who) if who.eq_ignore_ascii_case(login.trim()) => "ok",
        Ok(_) => "broken",                                          // wrong account
        Err(e) if e.contains("did not recognize this key") => "broken", // removed
        Err(_) => "unknown",                                       // network/other
    }
}
