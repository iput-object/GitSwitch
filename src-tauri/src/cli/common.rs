use crate::models::StoredProfile;

/// One-line format for a profile, reused by list/switch/current/add.
pub fn fmt_profile(p: &StoredProfile) -> String {
    format!(
        "{} ({}) <{}> [{}]",
        p.login, p.display_name, p.git_email, p.provider_name
    )
}

/// Unwrap a service Result or print the error and exit.
pub fn unwrap_or_exit<T>(result: Result<T, String>) -> T {
    match result {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

pub const NO_PROFILES: &str =
    "No profiles available. Add one with: gitswitch add --provider <name> --key <path>";
