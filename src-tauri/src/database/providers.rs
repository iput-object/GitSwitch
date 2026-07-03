use crate::database::core::open;
use crate::models::{NewProvider, Provider, ProviderActive};
use crate::provider;
use crate::utils::now_nanos;
use rusqlite::{params, Connection};
use tauri::AppHandle;

pub(crate) fn set_partial_active(
    conn: &Connection,
    provider_id: &str,
    profile_id: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO active_by_provider (provider_id, profile_id) VALUES (?1, ?2)
         ON CONFLICT(provider_id) DO UPDATE SET profile_id = ?2",
        params![provider_id, profile_id],
    )
    .map_err(|e| format!("Could not record active provider: {e}"))?;
    Ok(())
}

pub(crate) fn read_partial(conn: &Connection) -> Result<Vec<ProviderActive>, String> {
    let mut stmt = conn
        .prepare("SELECT provider_id, profile_id FROM active_by_provider")
        .map_err(|e| format!("Could not read active providers: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProviderActive {
                provider_id: row.get(0)?,
                profile_id: row.get(1)?,
            })
        })
        .map_err(|e| format!("Could not read active providers: {e}"))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| format!("Could not read active providers: {e}"))?);
    }
    Ok(out)
}

#[tauri::command]
pub fn list_providers(app: AppHandle) -> Result<Vec<Provider>, String> {
    let conn = open(&app)?;
    provider::list(&conn)
}

#[tauri::command]
pub fn add_provider(app: AppHandle, provider: NewProvider) -> Result<Provider, String> {
    let conn = open(&app)?;
    let host = provider.host.trim().to_string();
    if host.is_empty() {
        return Err("Enter the provider host (e.g. git.company.com).".to_string());
    }
    let name = {
        let n = provider.name.trim();
        if n.is_empty() {
            host.clone()
        } else {
            n.to_string()
        }
    };
    let id = host.clone();
    let api = provider
        .api_base_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO providers
            (id, kind, name, host, api_base_url, self_hosted, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            provider.kind,
            name,
            host,
            api,
            provider.self_hosted as i64,
            now_nanos() as i64
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("A provider for {host} already exists.")
        } else {
            format!("Could not add provider: {e}")
        }
    })?;

    provider::load(&conn, &id)
}
