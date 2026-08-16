use crate::database::active::activate;
use crate::database::core::{
    clear_setting, open, read_one, read_setting, row_to_profile, ACTIVE_KEY, FROM_PROFILES,
    SELECT_COLS,
};
use crate::models::{NewProfile, StoredProfile};
use crate::provider;
use crate::utils::{data_uri, download_avatar, now_nanos};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use tauri::AppHandle;

#[tauri::command(async)]
pub fn add_profile(app: AppHandle, profile: NewProfile) -> Result<StoredProfile, String> {
    let conn = open(&app)?;
    let prov = provider::load(&conn, &profile.provider_id)?;

    let exists = conn
        .query_row(
            "SELECT 1 FROM profiles WHERE provider_id = ?1 AND login = ?2 LIMIT 1",
            params![profile.provider_id, profile.login],
            |_| Ok(()),
        )
        .optional()
        .map_err(|e| format!("Could not check for duplicates: {e}"))?
        .is_some();
    if exists {
        return Err(format!(
            "@{} is already added for {}.",
            profile.login, prov.name
        ));
    }

    let id = format!("{}-{:x}", profile.login, now_nanos());

    let (blob, mime) = match profile.avatar_url.as_deref() {
        Some(url) => match download_avatar(url) {
            Some((b, m)) => (Some(b), Some(m)),
            None => (None, None),
        },
        None => (None, None),
    };

    let stats = provider::overview(&prov, &profile.login);

    conn.execute(
        "INSERT INTO profiles
            (id, provider_id, login, display_name, git_name, git_email,
             avatar_blob, avatar_mime, key_path, public_key, created_at,
             public_repos, followers, commits)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            profile.provider_id,
            profile.login,
            profile.display_name,
            profile.git_name,
            profile.git_email,
            blob,
            mime,
            profile.key_path,
            profile.public_key,
            now_nanos() as i64,
            stats.public_repos,
            stats.followers,
            stats.commits,
        ],
    )
    .map_err(|e| format!("Could not save profile: {e}"))?;

    crate::tray::rebuild(&app);
    Ok(StoredProfile {
        id,
        provider_id: profile.provider_id,
        login: profile.login,
        display_name: profile.display_name,
        git_name: profile.git_name,
        git_email: profile.git_email,
        avatar: data_uri(blob, mime),
        key_missing: !crate::ssh::expand_path(&profile.key_path).exists(),
        key_path: profile.key_path,
        public_key: profile.public_key,
        public_repos: stats.public_repos,
        followers: stats.followers,
        commits: stats.commits,
        provider_name: prov.name,
        provider_host: prov.host,
        provider_kind: prov.kind,
    })
}

#[tauri::command]
pub fn list_profiles(app: AppHandle) -> Result<Vec<StoredProfile>, String> {
    let conn = open(&app)?;
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {SELECT_COLS} {FROM_PROFILES} ORDER BY pr.created_at ASC"
        ))
        .map_err(|e| format!("Could not read profiles: {e}"))?;

    let rows = stmt
        .query_map([], row_to_profile)
        .map_err(|e| format!("Could not read profiles: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("Could not read profiles: {e}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open(&app)?;
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])
        .map_err(|e| format!("Could not delete profile: {e}"))?;
    crate::tray::rebuild(&app);
    Ok(())
}

#[tauri::command]
pub fn delete_all_profiles(app: AppHandle) -> Result<(), String> {
    let conn = open(&app)?;
    conn.execute("DELETE FROM profiles", params![])
        .map_err(|e| format!("Could not delete profiles: {e}"))?;
    let _ = clear_setting(&conn, ACTIVE_KEY);
    crate::tray::rebuild(&app);
    Ok(())
}

#[tauri::command(async)]
pub fn refresh_profile(app: AppHandle, id: String) -> Result<StoredProfile, String> {
    let conn = open(&app)?;
    let (login, provider_id): (String, String) = conn
        .query_row(
            "SELECT login, provider_id FROM profiles WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;
    let prov = provider::load(&conn, &provider_id)?;

    let overview = provider::overview(&prov, &login);
    let avatar = overview.avatar_url.as_deref().and_then(download_avatar);

    conn.execute(
        "UPDATE profiles
         SET public_repos = ?1, followers = ?2, commits = ?3
         WHERE id = ?4",
        params![
            overview.public_repos,
            overview.followers,
            overview.commits,
            id
        ],
    )
    .map_err(|e| format!("Could not update profile: {e}"))?;

    if let Some((blob, mime)) = &avatar {
        conn.execute(
            "UPDATE profiles SET avatar_blob = ?1, avatar_mime = ?2 WHERE id = ?3",
            params![blob, mime, id],
        )
        .map_err(|e| format!("Could not update avatar: {e}"))?;
    }

    let updated = read_one(&conn, &id)?;
    crate::tray::rebuild(&app);
    Ok(updated)
}

#[tauri::command(async)]
pub fn update_profile_details(
    app: AppHandle,
    id: String,
    display_name: String,
    git_email: String,
) -> Result<(), String> {
    let conn = open(&app)?;
    conn.execute(
        "UPDATE profiles SET display_name = ?1, git_name = ?1, git_email = ?2 WHERE id = ?3",
        params![display_name, git_email, id],
    )
    .map_err(|e| format!("Could not update profile: {e}"))?;

    if read_setting(&conn, ACTIVE_KEY).as_deref() == Some(&id) {
        let _ = activate(&app, &id);
    }

    crate::tray::rebuild(&app);
    Ok(())
}

#[derive(Serialize)]
pub struct ProfileDefaults {
    pub display_name: String,
    pub git_email: String,
}

#[tauri::command(async)]
pub fn get_profile_defaults(app: AppHandle, id: String) -> Result<ProfileDefaults, String> {
    let conn = open(&app)?;
    let (login, provider_id): (String, String) = conn
        .query_row(
            "SELECT login, provider_id FROM profiles WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;
    let prov = provider::load(&conn, &provider_id)?;

    let account = provider::api::fetch_account(&prov, &login);
    let title = account.name.unwrap_or_else(|| login.clone());
    let kind = crate::provider::ProviderKind::parse(&prov.kind);
    let email = account
        .email
        .or_else(|| crate::provider::suggested_email(kind, &login, account.id))
        .unwrap_or_default();

    Ok(ProfileDefaults {
        display_name: title,
        git_email: email,
    })
}

#[tauri::command(async)]
pub fn reset_profile_defaults(app: AppHandle, id: String) -> Result<StoredProfile, String> {
    let conn = open(&app)?;
    let (login, provider_id): (String, String) = conn
        .query_row(
            "SELECT login, provider_id FROM profiles WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;
    let prov = provider::load(&conn, &provider_id)?;

    let account = provider::api::fetch_account(&prov, &login);
    let title = account.name.unwrap_or_else(|| login.clone());
    let kind = crate::provider::ProviderKind::parse(&prov.kind);
    let email = account
        .email
        .or_else(|| crate::provider::suggested_email(kind, &login, account.id))
        .unwrap_or_default();

    conn.execute(
        "UPDATE profiles SET display_name = ?1, git_name = ?1, git_email = ?2 WHERE id = ?3",
        params![title, email, id],
    )
    .map_err(|e| format!("Could not update profile: {e}"))?;

    if read_setting(&conn, ACTIVE_KEY).as_deref() == Some(&id) {
        let _ = activate(&app, &id);
    }

    let updated = read_one(&conn, &id)?;
    crate::tray::rebuild(&app);
    Ok(updated)
}
