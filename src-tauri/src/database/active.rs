use crate::database::core::{open, read_setting, set_setting, ACTIVE_KEY, FROM_PROFILES};
use crate::database::providers::{read_partial, set_partial_active};
use crate::models::{ActiveState, ProviderActive, UntrackedIdentity};
use crate::provider;
use crate::provider::ProviderKind;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Emitter};

pub fn activate(app: &AppHandle, id: &str) -> Result<(), String> {
    let conn = open(app)?;
    let (git_name, git_email, key_path, provider_id, host): (
        String,
        String,
        String,
        String,
        String,
    ) = conn
        .query_row(
            &format!(
                "SELECT pr.git_name, pr.git_email, pr.key_path, pr.provider_id, pv.host
                 {FROM_PROFILES} WHERE pr.id = ?1"
            ),
            params![id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .map_err(|e| format!("Profile not found: {e}"))?;

    crate::git::set_global("user.name", &git_name)?;
    crate::git::set_global("user.email", &git_email)?;
    crate::ssh::config::apply_ssh_config(&host, &key_path)?;

    let signing_key = crate::ssh::expand_path(&key_path);
    crate::git::set_global("gpg.format", "ssh")?;
    crate::git::set_global("user.signingkey", &signing_key.to_string_lossy())?;
    crate::git::set_global("commit.gpgsign", "true")?;

    set_setting(&conn, ACTIVE_KEY, id)?;
    set_partial_active(&conn, &provider_id, id)?;
    verify_active(app, git_name, git_email, host, key_path);
    Ok(())
}

fn verify_active(
    app: &AppHandle,
    git_name: String,
    git_email: String,
    host: String,
    key_path: String,
) {
    let app = app.clone();
    std::thread::spawn(move || {
        let problem = if crate::git::global("user.name").as_deref() != Some(&git_name) {
            Some("git user.name".to_string())
        } else if crate::git::global("user.email").as_deref() != Some(&git_email) {
            Some("git user.email".to_string())
        } else if crate::ssh::config::current_key_for_host(&host).as_ref()
            != Some(&crate::ssh::expand_path(&key_path))
        {
            Some(format!("the {host} SSH key"))
        } else {
            None
        };
        if let Some(what) = problem {
            let _ = app.emit("switch-unverified", format!("{what} did not take effect."));
        }
    });
}

#[tauri::command(async)]
pub fn activate_profile(app: AppHandle, id: String) -> Result<(), String> {
    activate(&app, &id)?;
    crate::tray::rebuild(&app);
    Ok(())
}

/// Wire a profile's key into its provider's SSH host block WITHOUT taking over
/// the global git commit identity. This makes `git push/pull` to that provider
/// authenticate as this profile ("SSH active"), while another profile keeps
/// owning `user.name`/`user.email`/the signing key.
pub fn activate_partial_inner(app: &AppHandle, id: &str) -> Result<(), String> {
    let conn = open(app)?;
    let (key_path, provider_id, host): (String, String, String) = conn
        .query_row(
            &format!(
                "SELECT pr.key_path, pr.provider_id, pv.host
                 {FROM_PROFILES} WHERE pr.id = ?1"
            ),
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;

    crate::ssh::config::apply_ssh_config(&host, &key_path)?;
    set_partial_active(&conn, &provider_id, id)?;
    Ok(())
}

#[tauri::command(async)]
pub fn activate_partial(app: AppHandle, id: String) -> Result<(), String> {
    activate_partial_inner(&app, &id)?;
    crate::tray::rebuild(&app);
    Ok(())
}

fn find_by_email(conn: &Connection, email: Option<&str>) -> Option<String> {
    let email = email?;
    conn.query_row(
        "SELECT id FROM profiles WHERE git_email = ?1 LIMIT 1",
        params![email],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .ok()
    .flatten()
}

fn find_by_key(conn: &Connection, provider_id: &str, key_path: &std::path::Path) -> Option<String> {
    let mut stmt = conn
        .prepare("SELECT id, key_path FROM profiles WHERE provider_id = ?1")
        .ok()?;
    let rows = stmt
        .query_map(params![provider_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .ok()?;
    for r in rows.flatten() {
        if crate::ssh::expand_path(&r.1) == key_path {
            return Some(r.0);
        }
    }
    None
}

#[tauri::command]
pub fn get_active_state(app: AppHandle) -> Result<ActiveState, String> {
    let conn = open(&app)?;
    Ok(ActiveState {
        active_id: read_setting(&conn, ACTIVE_KEY),
        partial: read_partial(&conn)?,
        git_name: crate::git::global("user.name"),
        git_email: crate::git::global("user.email"),
        untracked: Vec::new(),
    })
}

#[tauri::command(async)]
pub fn reconcile_active(app: AppHandle) -> Result<ActiveState, String> {
    let conn = open(&app)?;
    let git_name = crate::git::global("user.name");
    let git_email = crate::git::global("user.email");

    let mut partial = Vec::new();
    let mut untracked = Vec::new();
    for prov in provider::list(&conn)? {
        let Some(key) = crate::ssh::config::current_key_for_host(&prov.host) else {
            continue;
        };
        if let Some(profile_id) = find_by_key(&conn, &prov.id, &key) {
            let _ = set_partial_active(&conn, &prov.id, &profile_id);
            partial.push(ProviderActive {
                provider_id: prov.id.clone(),
                profile_id,
            });
        } else {
            let login =
                crate::ssh::ssh_identify(&prov.host, ProviderKind::parse(&prov.kind), &key).ok();
            untracked.push(UntrackedIdentity {
                provider_id: prov.id.clone(),
                host: prov.host.clone(),
                login,
                key_path: key.to_string_lossy().into_owned(),
            });
        }
    }

    let active_id = find_by_email(&conn, git_email.as_deref());
    if let Some(id) = &active_id {
        let _ = set_setting(&conn, ACTIVE_KEY, id);
    }

    Ok(ActiveState {
        active_id,
        partial,
        git_name,
        git_email,
        untracked,
    })
}
