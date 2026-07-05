use crate::paths::{command, null_device};
use crate::provider::{self, ProviderKind};
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
