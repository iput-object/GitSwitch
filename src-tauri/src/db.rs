//! Local persistence. Profiles live in a SQLite database in the app data dir;
//! avatars are downloaded once and stored as BLOBs so they render offline.
//! Private keys are never stored here, only their on-disk paths.

use base64::{engine::general_purpose, Engine as _};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredProfile {
    id: String,
    display_name: String,
    git_name: String,
    git_email: String,
    github_login: String,
    /// Locally cached avatar as a `data:` URI, when one was saved.
    avatar: Option<String>,
    key_path: String,
    public_key: String,
    /// True when the private key file this profile points at is gone from disk.
    key_missing: bool,
    /// Public GitHub stats for the dashboard (best-effort, may be null).
    public_repos: Option<i64>,
    followers: Option<i64>,
    commits: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProfile {
    display_name: String,
    git_name: String,
    git_email: String,
    github_login: String,
    avatar_url: Option<String>,
    key_path: String,
    public_key: String,
}

fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

/// Open the database (creating the file and schema on first use).
fn open(app: &AppHandle) -> Result<Connection, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create app data dir: {e}"))?;
    let conn = Connection::open(dir.join("gitswitch.db"))
        .map_err(|e| format!("Could not open database: {e}"))?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS profiles (
            id           TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            git_name     TEXT NOT NULL,
            git_email    TEXT NOT NULL,
            github_login TEXT NOT NULL,
            avatar_blob  BLOB,
            avatar_mime  TEXT,
            key_path     TEXT NOT NULL,
            public_key   TEXT NOT NULL,
            created_at   INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )
    .map_err(|e| format!("Could not init database: {e}"))?;

    // Migrations: add stat columns to pre-existing databases. The duplicate
    // column error on an already-migrated DB is expected and ignored.
    for column in ["public_repos", "followers", "commits"] {
        let _ = conn.execute(
            &format!("ALTER TABLE profiles ADD COLUMN {column} INTEGER"),
            [],
        );
    }
    Ok(conn)
}

/// Build a StoredProfile from the standard SELECT column order.
fn row_to_profile(row: &rusqlite::Row) -> rusqlite::Result<StoredProfile> {
    let blob: Option<Vec<u8>> = row.get(5)?;
    let mime: Option<String> = row.get(6)?;
    let key_path: String = row.get(7)?;
    let key_missing = !crate::ssh::expand_path(&key_path).exists();
    Ok(StoredProfile {
        id: row.get(0)?,
        display_name: row.get(1)?,
        git_name: row.get(2)?,
        git_email: row.get(3)?,
        github_login: row.get(4)?,
        avatar: data_uri(blob, mime),
        key_path,
        public_key: row.get(8)?,
        key_missing,
        public_repos: row.get(9)?,
        followers: row.get(10)?,
        commits: row.get(11)?,
    })
}

const SELECT_COLS: &str = "id, display_name, git_name, git_email, github_login,
     avatar_blob, avatar_mime, key_path, public_key,
     public_repos, followers, commits";

fn read_one(conn: &Connection, id: &str) -> Result<StoredProfile, String> {
    conn.query_row(
        &format!("SELECT {SELECT_COLS} FROM profiles WHERE id = ?1"),
        params![id],
        row_to_profile,
    )
    .map_err(|e| format!("Could not read profile: {e}"))
}

const ACTIVE_KEY: &str = "active_profile";

/// Upsert a key/value into the settings table.
fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(|e| format!("Could not write setting '{key}': {e}"))?;
    Ok(())
}

fn clear_setting(conn: &Connection, key: &str) -> Result<(), String> {
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
        .map_err(|e| format!("Could not clear setting '{key}': {e}"))?;
    Ok(())
}

fn read_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .ok()
    .flatten()
}

fn data_uri(blob: Option<Vec<u8>>, mime: Option<String>) -> Option<String> {
    let bytes = blob?;
    if bytes.is_empty() {
        return None;
    }
    let mime = mime.unwrap_or_else(|| "image/png".to_string());
    Some(format!(
        "data:{mime};base64,{}",
        general_purpose::STANDARD.encode(&bytes)
    ))
}

/// Fetch the avatar image once, returning (bytes, mime). Failure is non-fatal.
fn download_avatar(url: &str) -> Option<(Vec<u8>, String)> {
    let resp = ureq::get(url).set("User-Agent", "GitSwitch").call().ok()?;
    let mime = resp
        .header("Content-Type")
        .unwrap_or("image/png")
        .to_string();
    let mut bytes = Vec::new();
    resp.into_reader().read_to_end(&mut bytes).ok()?;
    if bytes.is_empty() {
        return None;
    }
    Some((bytes, mime))
}

#[tauri::command]
pub fn add_profile(app: AppHandle, profile: NewProfile) -> Result<StoredProfile, String> {
    let conn = open(&app)?;

    // One profile per GitHub account.
    let exists = conn
        .query_row(
            "SELECT 1 FROM profiles WHERE github_login = ?1 LIMIT 1",
            params![profile.github_login],
            |_| Ok(()),
        )
        .optional()
        .map_err(|e| format!("Could not check for duplicates: {e}"))?
        .is_some();
    if exists {
        return Err(format!("@{} is already added.", profile.github_login));
    }

    let id = format!("{}-{:x}", profile.github_login, now_nanos());

    let (blob, mime) = match profile.avatar_url.as_deref() {
        Some(url) => match download_avatar(url) {
            Some((b, m)) => (Some(b), Some(m)),
            None => (None, None),
        },
        None => (None, None),
    };

    let stats = crate::github::overview(&profile.github_login);

    conn.execute(
        "INSERT INTO profiles
            (id, display_name, git_name, git_email, github_login,
             avatar_blob, avatar_mime, key_path, public_key, created_at,
             public_repos, followers, commits)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            profile.display_name,
            profile.git_name,
            profile.git_email,
            profile.github_login,
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
        display_name: profile.display_name,
        git_name: profile.git_name,
        git_email: profile.git_email,
        github_login: profile.github_login,
        avatar: data_uri(blob, mime),
        key_missing: !crate::ssh::expand_path(&profile.key_path).exists(),
        key_path: profile.key_path,
        public_key: profile.public_key,
        public_repos: stats.public_repos,
        followers: stats.followers,
        commits: stats.commits,
    })
}

#[tauri::command]
pub fn list_profiles(app: AppHandle) -> Result<Vec<StoredProfile>, String> {
    let conn = open(&app)?;
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {SELECT_COLS} FROM profiles ORDER BY created_at ASC"
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

/// Re-pull the display title, avatar, and stats from GitHub for a saved
/// profile. The committed email and key are left untouched.
#[tauri::command]
pub fn refresh_profile(app: AppHandle, id: String) -> Result<StoredProfile, String> {
    let conn = open(&app)?;
    let login: String = conn
        .query_row(
            "SELECT github_login FROM profiles WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;

    let overview = crate::github::overview(&login);
    let title = overview.name.unwrap_or_else(|| login.clone());
    let avatar = overview.avatar_url.as_deref().and_then(download_avatar);

    // Stats always update; avatar only when we managed to fetch a new one.
    conn.execute(
        "UPDATE profiles
         SET display_name = ?1, git_name = ?2,
             public_repos = ?3, followers = ?4, commits = ?5
         WHERE id = ?6",
        params![
            title,
            title,
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

    let updated = read_one(&conn, &id);
    crate::tray::rebuild(&app);
    updated
}

/// Make a profile the active identity for the whole machine: set the global
/// git name/email and point ~/.ssh/config at its key, then record it as active.
/// Shared by the window command and the tray.
pub fn activate(app: &AppHandle, id: &str) -> Result<(), String> {
    let conn = open(app)?;
    let (git_name, git_email, key_path): (String, String, String) = conn
        .query_row(
            "SELECT git_name, git_email, key_path FROM profiles WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Profile not found: {e}"))?;

    crate::git::set_global("user.name", &git_name)?;
    crate::git::set_global("user.email", &git_email)?;
    crate::ssh::apply_ssh_config(&key_path)?;

    set_setting(&conn, ACTIVE_KEY, id)?;
    verify_active(app, git_name, git_email, key_path);
    Ok(())
}

/// Best-effort, off the critical path: read the live identity back and confirm
/// it matches what we just wrote (a write can exit 0 yet not land, e.g. another
/// process clobbers ~/.ssh/config). Runs in a thread so it never slows a switch;
/// on mismatch it emits "switch-unverified" for the UI to surface, nothing more.
fn verify_active(app: &AppHandle, git_name: String, git_email: String, key_path: String) {
    let app = app.clone();
    std::thread::spawn(move || {
        let problem = if crate::git::global("user.name").as_deref() != Some(&git_name) {
            Some("git user.name")
        } else if crate::git::global("user.email").as_deref() != Some(&git_email) {
            Some("git user.email")
        } else if crate::ssh::current_github_key().as_ref()
            != Some(&crate::ssh::expand_path(&key_path))
        {
            Some("the github.com SSH key")
        } else {
            None
        };
        if let Some(what) = problem {
            let _ = app.emit("switch-unverified", format!("{what} did not take effect."));
        }
    });
}

#[tauri::command]
pub fn activate_profile(app: AppHandle, id: String) -> Result<(), String> {
    activate(&app, &id)?;
    crate::tray::rebuild(&app);
    Ok(())
}

/// Lightweight list for the tray menu: (id, display_name) plus the active id.
pub fn list_for_tray(app: &AppHandle) -> (Vec<(String, String)>, Option<String>) {
    let Ok(conn) = open(app) else {
        return (Vec::new(), None);
    };
    let active = read_setting(&conn, ACTIVE_KEY);

    let mut items = Vec::new();
    if let Ok(mut stmt) =
        conn.prepare("SELECT id, display_name FROM profiles ORDER BY created_at ASC")
    {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            items.extend(rows.flatten());
        }
    }
    (items, active)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveState {
    /// Id of the profile matching the live on-disk identity, if tracked.
    matched_id: Option<String>,
    /// Current global git identity, for display or import.
    git_name: Option<String>,
    git_email: Option<String>,
    /// The github.com key currently in ~/.ssh/config, if set.
    key_path: Option<String>,
    /// GitHub login that key belongs to, when it is NOT one of our profiles.
    unmanaged_login: Option<String>,
}

/// Find a profile that matches the live identity, by key path then by email.
fn find_match(
    conn: &Connection,
    key_path: Option<&str>,
    email: Option<&str>,
) -> Result<Option<String>, String> {
    let by = |column: &str, value: &str| -> Result<Option<String>, String> {
        conn.query_row(
            &format!("SELECT id FROM profiles WHERE {column} = ?1 LIMIT 1"),
            params![value],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("Could not match profile: {e}"))
    };
    if let Some(kp) = key_path {
        if let Some(id) = by("key_path", kp)? {
            return Ok(Some(id));
        }
    }
    if let Some(em) = email {
        if let Some(id) = by("git_email", em)? {
            return Ok(Some(id));
        }
    }
    Ok(None)
}

/// Reconcile the app with reality on startup: read the live SSH/git identity,
/// match it to a saved profile (and mark it active), or report an untracked
/// identity so the user can import it.
#[tauri::command]
pub fn reconcile_active(app: AppHandle) -> Result<ActiveState, String> {
    let conn = open(&app)?;
    let git_name = crate::git::global("user.name");
    let git_email = crate::git::global("user.email");
    let key = crate::ssh::current_github_key();
    let key_path = key.as_ref().map(|p| p.to_string_lossy().into_owned());

    let matched_id = find_match(&conn, key_path.as_deref(), git_email.as_deref())?;

    // Keep the stored "active" selection in sync with what's actually in use.
    if let Some(id) = &matched_id {
        let _ = set_setting(&conn, ACTIVE_KEY, id);
    }

    // Untracked identity? Ask GitHub who the in-use key belongs to.
    let unmanaged_login = match (&matched_id, &key) {
        (None, Some(path)) => crate::ssh::ssh_identify(path).ok(),
        _ => None,
    };

    Ok(ActiveState {
        matched_id,
        git_name,
        git_email,
        key_path,
        unmanaged_login,
    })
}

#[tauri::command]
pub fn get_active_profile(app: AppHandle) -> Result<Option<String>, String> {
    let conn = open(&app)?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = 'active_profile'",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("Could not read active profile: {e}"))
}

#[tauri::command]
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

    let active_id = get_active_profile(app.clone()).unwrap_or(None);
    if active_id.as_deref() == Some(&id) {
        let _ = activate(&app, &id);
    }

    crate::tray::rebuild(&app);
    Ok(())
}
