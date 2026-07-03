use serde::{Deserialize, Serialize};

/// A git host GitSwitch knows how to talk to. The three built-ins (GitHub,
/// GitLab, Bitbucket) are seeded on first run; users can add self-hosted ones.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    /// Behaviour flavour: "github" | "gitlab" | "bitbucket". Decides how we
    /// read the SSH login banner and which public API shape to expect.
    pub kind: String,
    pub name: String,
    /// The SSH + git host, e.g. "github.com" or "git.company.com". Unique.
    pub host: String,
    pub api_base_url: Option<String>,
    pub self_hosted: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProvider {
    pub kind: String,
    pub name: String,
    pub host: String,
    pub api_base_url: Option<String>,
    pub self_hosted: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredProfile {
    pub id: String,
    pub provider_id: String,
    pub login: String,
    pub display_name: String,
    pub git_name: String,
    pub git_email: String,
    /// Locally cached avatar as a `data:` URI, when one was saved.
    pub avatar: Option<String>,
    pub key_path: String,
    pub public_key: String,
    /// True when the private key file this profile points at is gone from disk.
    pub key_missing: bool,
    /// Public stats for the dashboard (best-effort, may be null; only GitHub
    /// exposes these unauthenticated).
    pub public_repos: Option<i64>,
    pub followers: Option<i64>,
    pub commits: Option<i64>,
    /// Provider fields, joined in at read time for display and links.
    pub provider_name: String,
    pub provider_host: String,
    pub provider_kind: String,
}

/// The result of syncing a key against a provider: who the key belongs to,
/// plus the display details we could look up. Replaces the old `GithubAccount`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderAccount {
    pub provider_id: String,
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub suggested_email: String,
    pub key_path: String,
    pub public_key: String,
    /// True when GitSwitch staged this key and must move it into ~/.ssh on save.
    pub managed: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProfile {
    pub provider_id: String,
    pub login: String,
    pub display_name: String,
    pub git_name: String,
    pub git_email: String,
    pub avatar_url: Option<String>,
    pub key_path: String,
    pub public_key: String,
}

/// Which profile is wired into a given provider's SSH host block (the
/// "partially active" set — at most one per provider).
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderActive {
    pub provider_id: String,
    pub profile_id: String,
}

/// An in-use SSH identity found on a provider host that maps to no saved
/// profile — offered to the user for import.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UntrackedIdentity {
    pub provider_id: String,
    pub host: String,
    pub login: Option<String>,
    pub key_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveState {
    /// The single fully-active profile that owns the global git commit identity.
    pub active_id: Option<String>,
    /// The partially-active set: provider -> profile wired into that host block.
    pub partial: Vec<ProviderActive>,
    /// Current global git identity, for display or import.
    pub git_name: Option<String>,
    pub git_email: Option<String>,
    /// In-use keys on known hosts that are not one of our profiles.
    pub untracked: Vec<UntrackedIdentity>,
}
