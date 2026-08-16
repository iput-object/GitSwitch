use super::common::{fmt_profile, unwrap_or_exit};
use crate::models::NewProfile;

/// Add a profile from the CLI: resolve the SSH key against a provider, discover
/// the account, and save it — same flow as the GUI but non-interactive.
pub fn run(app: &tauri::AppHandle, provider_name: &str, key_input: &str) {
    // 1. Find the provider by name (case-insensitive)
    let providers = unwrap_or_exit(crate::database::providers::list_providers(app.clone()));
    let provider = providers
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(provider_name) || p.id.eq_ignore_ascii_case(provider_name));

    let Some(provider) = provider else {
        eprintln!("No provider found matching '{provider_name}'.");
        if providers.is_empty() {
            eprintln!("No providers available.");
        } else {
            eprintln!("Available providers:");
            for p in &providers {
                eprintln!("  {} ({})", p.name, p.host);
            }
        }
        std::process::exit(1);
    };

    // 2. Sync: resolve key → SSH identify → API lookup
    println!("Syncing key with {} ({})...", provider.name, provider.host);
    let account = unwrap_or_exit(crate::provider::sync_provider(
        app.clone(),
        provider.id.clone(),
        key_input.to_string(),
    ));

    // 3. If the key was staged (managed), commit it to ~/.ssh
    let final_key_path = if account.managed {
        unwrap_or_exit(crate::ssh::keys::commit_key(
            account.key_path.clone(),
            account.login.clone(),
        ))
    } else {
        account.key_path.clone()
    };

    // 4. Save the profile
    let display_name = account.name.clone().unwrap_or_else(|| account.login.clone());
    let profile = NewProfile {
        provider_id: account.provider_id,
        login: account.login.clone(),
        display_name: display_name.clone(),
        git_name: display_name,
        git_email: account.suggested_email,
        avatar_url: account.avatar_url,
        key_path: final_key_path,
        public_key: account.public_key,
    };

    let saved = unwrap_or_exit(crate::database::profiles::add_profile(app.clone(), profile));
    println!("Added profile: {}", fmt_profile(&saved));
}
