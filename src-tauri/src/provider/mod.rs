use crate::database;
use crate::models::{Provider, ProviderAccount};
use crate::ssh;
use rusqlite::{params, Connection};
use tauri::AppHandle;

pub(crate) mod api;
pub(crate) mod parsers;

/// Behaviour flavour for a provider, parsed from `Provider::kind`.
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum ProviderKind {
    Github,
    Gitlab,
    Bitbucket,
}

impl ProviderKind {
    pub fn parse(kind: &str) -> ProviderKind {
        match kind {
            "gitlab" => ProviderKind::Gitlab,
            "bitbucket" => ProviderKind::Bitbucket,
            _ => ProviderKind::Github,
        }
    }
}

pub use api::Overview;
pub use parsers::{parse_login, suggested_email};

const COLS: &str = "id, kind, name, host, api_base_url, self_hosted";

fn row_to_provider(r: &rusqlite::Row) -> rusqlite::Result<Provider> {
    Ok(Provider {
        id: r.get(0)?,
        kind: r.get(1)?,
        name: r.get(2)?,
        host: r.get(3)?,
        api_base_url: r.get(4)?,
        self_hosted: r.get::<_, i64>(5)? != 0,
    })
}

/// Load a single provider by id.
pub fn load(conn: &Connection, id: &str) -> Result<Provider, String> {
    conn.query_row(
        &format!("SELECT {COLS} FROM providers WHERE id = ?1"),
        params![id],
        row_to_provider,
    )
    .map_err(|e| format!("Provider not found: {e}"))
}

/// All known providers, oldest first (built-ins before user-added ones).
pub fn list(conn: &Connection) -> Result<Vec<Provider>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {COLS} FROM providers ORDER BY created_at ASC"
        ))
        .map_err(|e| format!("Could not read providers: {e}"))?;
    let rows = stmt
        .query_map([], row_to_provider)
        .map_err(|e| format!("Could not read providers: {e}"))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("Could not read providers: {e}"))?);
    }
    Ok(out)
}

pub fn overview(provider: &Provider, login: &str) -> Overview {
    api::overview(provider, login)
}

/// Resolve the input field into a key, learn who it belongs to over SSH, and
/// look up the display details from the provider's public API.
// `(async)` runs this off the main thread (ssh identify + provider API).
#[tauri::command(async)]
pub fn sync_provider(
    app: AppHandle,
    provider_id: String,
    input: String,
) -> Result<ProviderAccount, String> {
    let conn = database::open(&app)?;
    let provider = load(&conn, &provider_id)?;
    let kind = ProviderKind::parse(&provider.kind);

    let (key_path, managed) = ssh::resolve_key_input(&input)?;
    let login = ssh::ssh_identify(&provider.host, kind, &key_path)?;
    let account = api::fetch_account(&provider, &login);

    let suggested_email = account
        .email
        .clone()
        .or_else(|| suggested_email(kind, &login, account.id))
        .unwrap_or_default();
    let public_key = ssh::read_public_key(&key_path);

    Ok(ProviderAccount {
        provider_id,
        login,
        name: account.name,
        avatar_url: account.avatar_url,
        suggested_email,
        key_path: key_path.to_string_lossy().into_owned(),
        public_key,
        managed,
    })
}
