//! GitHub identity sync. Given a key, we learn the `login` over SSH, then look
//! up the public profile to fill in name, avatar, and a suggested commit email.

use crate::ssh;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubAccount {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub suggested_email: String,
    pub key_path: String,
    pub public_key: String,
    /// True when GitSwitch staged this key and must move it into ~/.ssh on save.
    pub managed: bool,
}

#[derive(Default)]
struct Profile {
    name: Option<String>,
    avatar_url: Option<String>,
    email: Option<String>,
    id: Option<u64>,
    public_repos: Option<u64>,
    followers: Option<u64>,
}

/// Public profile snapshot for the dashboard: name, avatar, and stats.
#[derive(Default)]
pub struct Overview {
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub public_repos: Option<i64>,
    pub followers: Option<i64>,
    pub commits: Option<i64>,
}

/// Public, unauthenticated profile lookup keyed by the login SSH gave us.
/// Any failure degrades gracefully to empty fields.
fn fetch_profile(login: &str) -> Profile {
    let url = format!("https://api.github.com/users/{login}");
    let json = ureq::get(&url)
        .set("User-Agent", "GitSwitch")
        .set("Accept", "application/vnd.github+json")
        .call()
        .ok()
        .and_then(|resp| resp.into_json::<serde_json::Value>().ok());

    match json {
        Some(json) => Profile {
            name: json
                .get("name")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            avatar_url: json
                .get("avatar_url")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            email: json
                .get("email")
                .and_then(|v| v.as_str())
                .map(str::to_string),
            id: json.get("id").and_then(|v| v.as_u64()),
            public_repos: json.get("public_repos").and_then(|v| v.as_u64()),
            followers: json.get("followers").and_then(|v| v.as_u64()),
        },
        None => Profile::default(),
    }
}

/// Best-effort total public commit count via the commit search API. This is
/// rate-limited and may fail; the dashboard simply hides the stat when None.
fn fetch_commit_count(login: &str) -> Option<u64> {
    let url = format!("https://api.github.com/search/commits?q=author:{login}&per_page=1");
    ureq::get(&url)
        .set("User-Agent", "GitSwitch")
        .set("Accept", "application/vnd.github.cloak-preview+json")
        .call()
        .ok()?
        .into_json::<serde_json::Value>()
        .ok()?
        .get("total_count")
        .and_then(|v| v.as_u64())
}

/// Name, avatar, and stats for a login. Used to (re)populate a saved profile
/// without the SSH key (the login alone keys the public API).
pub fn overview(login: &str) -> Overview {
    let p = fetch_profile(login);
    Overview {
        name: p.name,
        avatar_url: p.avatar_url,
        public_repos: p.public_repos.map(|v| v as i64),
        followers: p.followers.map(|v| v as i64),
        commits: fetch_commit_count(login).map(|v| v as i64),
    }
}

/// GitHub's privacy-safe commit address when no public email is set.
fn noreply_email(login: &str, id: Option<u64>) -> String {
    match id {
        Some(id) => format!("{id}+{login}@users.noreply.github.com"),
        None => format!("{login}@users.noreply.github.com"),
    }
}

// `(async)` runs this off the main thread (ssh identify + GitHub API).
#[tauri::command(async)]
pub fn sync_github(input: String) -> Result<GithubAccount, String> {
    let (key_path, managed) = ssh::resolve_key_input(&input)?;
    let login = ssh::ssh_identify(&key_path)?;
    let profile = fetch_profile(&login);
    let suggested_email = profile
        .email
        .unwrap_or_else(|| noreply_email(&login, profile.id));
    let public_key = ssh::read_public_key(&key_path);

    Ok(GithubAccount {
        login,
        name: profile.name,
        avatar_url: profile.avatar_url,
        suggested_email,
        key_path: key_path.to_string_lossy().into_owned(),
        public_key,
        managed,
    })
}
