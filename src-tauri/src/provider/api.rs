use crate::models::Provider;
use crate::provider::ProviderKind;

/// Public profile snapshot for the dashboard: name, avatar, and stats. Only
/// GitHub fills the stats; others leave them `None`.
#[derive(Default)]
pub struct Overview {
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub public_repos: Option<i64>,
    pub followers: Option<i64>,
    pub commits: Option<i64>,
}

#[derive(Default)]
pub(crate) struct Account {
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub email: Option<String>,
    pub id: Option<u64>,
    pub public_repos: Option<u64>,
    pub followers: Option<u64>,
}

/// The API root for a provider, honoring an explicit `api_base_url` (needed for
/// self-hosted) and otherwise deriving the public default from the kind/host.
fn api_base(provider: &Provider) -> String {
    if let Some(base) = &provider.api_base_url {
        let base = base.trim_end_matches('/');
        if !base.is_empty() {
            return base.to_string();
        }
    }
    match ProviderKind::parse(&provider.kind) {
        ProviderKind::Github => "https://api.github.com".to_string(),
        ProviderKind::Gitlab => format!("https://{}/api/v4", provider.host),
        ProviderKind::Bitbucket => "https://api.bitbucket.org/2.0".to_string(),
    }
}

fn get_json(url: &str, accept: &str) -> Option<serde_json::Value> {
    ureq::get(url)
        .set("User-Agent", "GitSwitch")
        .set("Accept", accept)
        .call()
        .ok()?
        .into_json::<serde_json::Value>()
        .ok()
}

fn str_field(json: &serde_json::Value, key: &str) -> Option<String> {
    json.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

/// Unauthenticated public-profile lookup. Any failure degrades to empty fields.
pub(crate) fn fetch_account(provider: &Provider, login: &str) -> Account {
    let base = api_base(provider);
    match ProviderKind::parse(&provider.kind) {
        ProviderKind::Github => {
            let Some(j) = get_json(
                &format!("{base}/users/{login}"),
                "application/vnd.github+json",
            ) else {
                return Account::default();
            };
            Account {
                name: str_field(&j, "name"),
                avatar_url: str_field(&j, "avatar_url"),
                email: str_field(&j, "email"),
                id: j.get("id").and_then(|v| v.as_u64()),
                public_repos: j.get("public_repos").and_then(|v| v.as_u64()),
                followers: j.get("followers").and_then(|v| v.as_u64()),
            }
        }
        ProviderKind::Gitlab => {
            // The public users endpoint returns an array filtered by username.
            let Some(j) = get_json(
                &format!("{base}/users?username={login}"),
                "application/json",
            ) else {
                return Account::default();
            };
            match j.as_array().and_then(|a| a.first()) {
                Some(u) => Account {
                    name: str_field(u, "name"),
                    avatar_url: str_field(u, "avatar_url"),
                    email: None, // GitLab does not expose email unauthenticated.
                    id: u.get("id").and_then(|v| v.as_u64()),
                    public_repos: None,
                    followers: None,
                },
                None => Account::default(),
            }
        }
        ProviderKind::Bitbucket => {
            let Some(j) = get_json(&format!("{base}/users/{login}"), "application/json") else {
                return Account::default();
            };
            let avatar_url = j
                .get("links")
                .and_then(|l| l.get("avatar"))
                .and_then(|a| a.get("href"))
                .and_then(|v| v.as_str())
                .map(str::to_string);
            Account {
                name: str_field(&j, "display_name"),
                avatar_url,
                email: None, // Bitbucket never exposes email unauthenticated.
                id: None,    // Bitbucket ids are UUIDs; not used for noreply.
                public_repos: None,
                followers: None,
            }
        }
    }
}

/// Best-effort total public commit count (GitHub search API only). Rate-limited
/// and may fail; the dashboard hides the stat when None.
pub(crate) fn fetch_commit_count(provider: &Provider, login: &str) -> Option<u64> {
    let base = api_base(provider);
    let url = format!("{base}/search/commits?q=author:{login}&per_page=1");
    get_json(&url, "application/vnd.github.cloak-preview+json")?
        .get("total_count")
        .and_then(|v| v.as_u64())
}

/// Name, avatar, and stats for a login. Used to (re)populate a saved profile
/// without the SSH key (the login alone keys the public API).
pub fn overview(provider: &Provider, login: &str) -> Overview {
    let account = fetch_account(provider, login);
    let commits = match ProviderKind::parse(&provider.kind) {
        ProviderKind::Github => fetch_commit_count(provider, login),
        _ => None,
    };
    Overview {
        name: account.name,
        avatar_url: account.avatar_url,
        public_repos: account.public_repos.map(|v| v as i64),
        followers: account.followers.map(|v| v as i64),
        commits: commits.map(|v| v as i64),
    }
}
