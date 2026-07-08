use crate::provider::ProviderKind;

/// Pull the login out of an `ssh -T` banner. Each host greets differently:
///   github    → `Hi <login>!`
///   gitlab    → `Welcome to GitLab, @<login>!`
///   bitbucket → `logged in as <login>.`
pub fn parse_login(kind: ProviderKind, text: &str) -> Option<String> {
    let grab = |after: &str, until: char| -> Option<String> {
        let start = text.find(after)? + after.len();
        let rest = &text[start..];
        let end = rest.find(until)?;
        let login = rest[..end].trim();
        (!login.is_empty()).then(|| login.to_string())
    };
    match kind {
        ProviderKind::Github => grab("Hi ", '!'),
        ProviderKind::Gitlab => grab("Welcome to GitLab, @", '!'),
        ProviderKind::Bitbucket => grab("logged in as ", '.').or_else(|| {
            if text.contains("authenticated via ssh key") {
                let s = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                Some(format!("bitbucket-key-{s}"))
            } else {
                None
            }
        }),
    }
}

/// The provider's privacy-safe commit address when no public email is set.
/// GitLab needs the numeric id; Bitbucket has no such convention.
pub fn suggested_email(kind: ProviderKind, login: &str, id: Option<u64>) -> Option<String> {
    match kind {
        ProviderKind::Github => Some(match id {
            Some(id) => format!("{id}+{login}@users.noreply.github.com"),
            None => format!("{login}@users.noreply.github.com"),
        }),
        ProviderKind::Gitlab => id.map(|id| format!("{id}-{login}@users.noreply.gitlab.com")),
        ProviderKind::Bitbucket => None,
    }
}
