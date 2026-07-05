use crate::models::StoredProfile;
use crate::utils::{data_uri, now_nanos};
use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};

pub const ACTIVE_KEY: &str = "active_profile";

pub const SELECT_COLS: &str = "pr.id, pr.provider_id, pr.login, pr.display_name, pr.git_name,
     pr.git_email, pr.avatar_blob, pr.avatar_mime, pr.key_path, pr.public_key,
     pr.public_repos, pr.followers, pr.commits,
     pv.name, pv.host, pv.kind";
pub const FROM_PROFILES: &str = "FROM profiles pr JOIN providers pv ON pv.id = pr.provider_id";

/// Seed the three built-in providers if they are not already present. Idempotent
/// via INSERT OR IGNORE — safe on every open.
fn seed_providers(conn: &Connection) -> Result<(), String> {
    let now = now_nanos() as i64;
    let builtins = [
        ("github", "github", "GitHub", "github.com", "https://api.github.com"),
        ("gitlab", "gitlab", "GitLab", "gitlab.com", "https://gitlab.com/api/v4"),
        (
            "bitbucket",
            "bitbucket",
            "Bitbucket",
            "bitbucket.org",
            "https://api.bitbucket.org/2.0",
        ),
    ];
    for (id, kind, name, host, api) in builtins {
        conn.execute(
            "INSERT OR IGNORE INTO providers
                (id, kind, name, host, api_base_url, self_hosted, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            params![id, kind, name, host, api, now],
        )
        .map_err(|e| format!("Could not seed providers: {e}"))?;
    }
    Ok(())
}

/// Open the database (creating the file and schema on first use).
pub(crate) fn open(app: &AppHandle) -> Result<Connection, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create app data dir: {e}"))?;
    let conn = Connection::open(dir.join("gitswitch.db"))
        .map_err(|e| format!("Could not open database: {e}"))?;
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .map_err(|e| format!("Could not enable foreign keys: {e}"))?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS providers (
            id           TEXT PRIMARY KEY,
            kind         TEXT NOT NULL,
            name         TEXT NOT NULL,
            host         TEXT NOT NULL UNIQUE,
            api_base_url TEXT,
            self_hosted  INTEGER NOT NULL DEFAULT 0,
            created_at   INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS profiles (
            id           TEXT PRIMARY KEY,
            provider_id  TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
            login        TEXT NOT NULL,
            display_name TEXT NOT NULL,
            git_name     TEXT NOT NULL,
            git_email    TEXT NOT NULL,
            avatar_blob  BLOB,
            avatar_mime  TEXT,
            key_path     TEXT NOT NULL,
            public_key   TEXT NOT NULL,
            public_repos INTEGER,
            followers    INTEGER,
            commits      INTEGER,
            created_at   INTEGER NOT NULL,
            UNIQUE(provider_id, login)
        );
        CREATE TABLE IF NOT EXISTS active_by_provider (
            provider_id TEXT PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
            profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )
    .map_err(|e| format!("Could not init database: {e}"))?;

    seed_providers(&conn)?;

    Ok(conn)
}

pub(crate) fn row_to_profile(row: &rusqlite::Row) -> rusqlite::Result<StoredProfile> {
    let blob: Option<Vec<u8>> = row.get(6)?;
    let mime: Option<String> = row.get(7)?;
    let key_path: String = row.get(8)?;
    let key_missing = !crate::ssh::expand_path(&key_path).exists();
    Ok(StoredProfile {
        id: row.get(0)?,
        provider_id: row.get(1)?,
        login: row.get(2)?,
        display_name: row.get(3)?,
        git_name: row.get(4)?,
        git_email: row.get(5)?,
        avatar: data_uri(blob, mime),
        key_path,
        public_key: row.get(9)?,
        key_missing,
        public_repos: row.get(10)?,
        followers: row.get(11)?,
        commits: row.get(12)?,
        provider_name: row.get(13)?,
        provider_host: row.get(14)?,
        provider_kind: row.get(15)?,
    })
}

pub(crate) fn read_one(conn: &Connection, id: &str) -> Result<StoredProfile, String> {
    conn.query_row(
        &format!("SELECT {SELECT_COLS} {FROM_PROFILES} WHERE pr.id = ?1"),
        params![id],
        row_to_profile,
    )
    .map_err(|e| format!("Could not read profile: {e}"))
}

pub(crate) fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(|e| format!("Could not write setting '{key}': {e}"))?;
    Ok(())
}

pub(crate) fn clear_setting(conn: &Connection, key: &str) -> Result<(), String> {
    conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
        .map_err(|e| format!("Could not clear setting '{key}': {e}"))?;
    Ok(())
}

pub(crate) fn read_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .ok()
    .flatten()
}

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
