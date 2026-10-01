//! `~/.ssh/config` management. Each provider host gets its own GitSwitch-managed
//! block, so github.com, gitlab.com, bitbucket.org, etc. can each point at a
//! different key at the same time. We only ever touch the block for the host
//! being switched — every other host (managed or hand-written) is preserved.

use crate::ssh::fs::set_mode;
use crate::ssh::{expand_path, ssh_dir};
use std::path::PathBuf;

fn begin_marker(host: &str) -> String {
    format!("# >>> GitSwitch managed block: {host}")
}
fn end_marker(host: &str) -> String {
    format!("# <<< GitSwitch managed block: {host}")
}

/// The private key currently mapped to `host` in ~/.ssh/config, if any. Lets us
/// see which identity is in use for a provider even after manual edits.
pub fn current_key_for_host(host: &str) -> Option<PathBuf> {
    let text = std::fs::read_to_string(ssh_dir().ok()?.join("config")).ok()?;

    let mut in_host_block = false;
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut parts = line.splitn(2, char::is_whitespace);
        let keyword = parts.next().unwrap_or("").to_ascii_lowercase();
        let value = parts.next().unwrap_or("").trim();

        if keyword == "host" {
            in_host_block = value.split_whitespace().any(|p| p == host);
        } else if in_host_block && keyword == "identityfile" {
            return Some(expand_path(value.trim_matches('"')));
        }
    }
    None
}

/// Remove the GitSwitch-managed block for `host` (between its markers), leaving
/// everything else — including other hosts' managed blocks — untouched.
fn strip_managed_block(text: &str, host: &str) -> String {
    let begin = begin_marker(host);
    let end = end_marker(host);
    let lines: Vec<&str> = text.lines().collect();
    let b = lines.iter().position(|l| l.trim() == begin);
    let e = lines.iter().position(|l| l.trim() == end);
    if let (Some(b), Some(e)) = (b, e) {
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

/// Comment out any existing plain `Host <host>` block (outside our managed
/// block) so it cannot merge with and corrupt ours. A block runs from its
/// `Host`/`Match` line to the next one. Aliases (e.g. `github.com-lazy`) are
/// left alone.
fn comment_conflicting(text: &str, host: &str) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut in_conflict = false;

    for raw in text.lines() {
        let trimmed = raw.trim_start();
        let lower = trimmed.to_ascii_lowercase();
        let is_host = lower == "host" || lower.starts_with("host ");
        let is_match = lower == "match" || lower.starts_with("match ");

        if is_host || is_match {
            // A block boundary: this block conflicts only if it's a plain
            // `Host` whose patterns include exactly `host`.
            in_conflict = is_host
                && trimmed
                    .split_whitespace()
                    .skip(1)
                    .any(|pattern| pattern == host);
        }

        if in_conflict && !trimmed.is_empty() && !trimmed.starts_with('#') {
            out.push(format!("# {raw}"));
        } else {
            out.push(raw.to_string());
        }
    }
    out.join("\n")
}

/// Point `host` at `key_path` by rewriting only our managed block for that host
/// in ~/.ssh/config. The block goes first so it wins (ssh takes the first value
/// per parameter), any conflicting plain block for the same host is commented
/// out, and all other config — including other hosts' managed blocks — is kept.
pub fn apply_ssh_config(host: &str, key_path: &str) -> Result<(), String> {
    let config = ssh_dir()?.join("config");
    let existing = std::fs::read_to_string(&config).unwrap_or_default();
    let preserved = comment_conflicting(&strip_managed_block(&existing, host), host);

    // ssh splits arguments on whitespace, so a key path with spaces needs quotes.
    let identity = if key_path.contains(char::is_whitespace) {
        format!("\"{key_path}\"")
    } else {
        key_path.to_string()
    };
    let block = format!(
        "{begin}\n\
         # Managed by GitSwitch. Edits inside this block are overwritten on switch.\n\
         Host {host}\n    \
         HostName {host}\n    \
         User git\n    \
         IdentityFile {identity}\n    \
         IdentitiesOnly yes\n\
         {end}\n",
        begin = begin_marker(host),
        end = end_marker(host),
    );

    let mut content = block;
    let rest = preserved.trim();
    if !rest.is_empty() {
        content.push('\n');
        content.push_str(rest);
        content.push('\n');
    }

    // Write to a sibling file and rename over the original, so a crash or full
    // disk mid-write can never leave ~/.ssh/config truncated. Follow a symlinked
    // config (dotfile managers) so the rename replaces its target, not the link.
    let target = std::fs::canonicalize(&config).unwrap_or(config);
    let staged = target.with_file_name(".config.gitswitch-tmp");
    std::fs::write(&staged, content).map_err(|e| format!("Could not write ~/.ssh/config: {e}"))?;
    set_mode(&staged, 0o600);
    std::fs::rename(&staged, &target).map_err(|e| {
        let _ = std::fs::remove_file(&staged);
        format!("Could not write ~/.ssh/config: {e}")
    })?;
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    /// Point HOME at a fresh scratch dir. Single test, so no env races.
    fn scratch_home() -> PathBuf {
        let home = std::env::temp_dir().join(format!("gitswitch-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&home);
        std::fs::create_dir_all(home.join(".ssh")).unwrap();
        // SAFETY: only this test touches HOME, and it runs on one thread.
        unsafe { std::env::set_var("HOME", &home) };
        home
    }

    #[test]
    fn apply_rewrites_block_atomically_and_keeps_symlinks() {
        let home = scratch_home();
        let real = home.join("dotfiles-ssh-config");
        std::fs::write(&real, "Host github.com\n    IdentityFile ~/.ssh/old\n\nHost other\n    User me\n").unwrap();
        let link = home.join(".ssh/config");
        std::os::unix::fs::symlink(&real, &link).unwrap();

        apply_ssh_config("github.com", "/keys/my key").unwrap();
        apply_ssh_config("github.com", "/keys/second").unwrap();

        // The link survives and its target holds exactly one managed block.
        assert!(std::fs::symlink_metadata(&link).unwrap().file_type().is_symlink());
        let text = std::fs::read_to_string(&real).unwrap();
        assert_eq!(text.matches(&begin_marker("github.com")).count(), 1);
        assert!(text.contains("IdentityFile /keys/second"));
        assert!(text.contains("#     IdentityFile ~/.ssh/old"), "{text}");
        assert!(text.contains("Host other\n    User me"));
        assert!(!home.join(".ssh/.config.gitswitch-tmp").exists());
        assert_eq!(current_key_for_host("github.com"), Some(PathBuf::from("/keys/second")));

        // Paths with spaces are quoted so ssh reads them as one argument.
        apply_ssh_config("gitlab.com", "/keys/my key").unwrap();
        let text = std::fs::read_to_string(&real).unwrap();
        assert!(text.contains("IdentityFile \"/keys/my key\""));
        assert_eq!(current_key_for_host("gitlab.com"), Some(PathBuf::from("/keys/my key")));

        let _ = std::fs::remove_dir_all(&home);
    }
}
