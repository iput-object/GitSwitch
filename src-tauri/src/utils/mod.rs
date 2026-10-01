use base64::{engine::general_purpose, Engine as _};
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use ureq::Agent;

/// Largest avatar we'll keep in the database (and re-encode on every list).
const AVATAR_MAX_BYTES: u64 = 2 * 1024 * 1024;

/// One shared HTTP agent for every provider/API call. The global timeout keeps a
/// stalled host from pinning a worker thread forever; sharing it reuses pooled
/// connections across a refresh-all instead of opening a fresh one per request.
pub fn http() -> &'static Agent {
    static AGENT: OnceLock<Agent> = OnceLock::new();
    AGENT.get_or_init(|| {
        Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(15)))
            .user_agent("GitSwitch")
            .build()
            .into()
    })
}

pub fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0)
}

pub fn data_uri(blob: Option<Vec<u8>>, mime: Option<String>) -> Option<String> {
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
pub fn download_avatar(url: &str) -> Option<(Vec<u8>, String)> {
    let mut resp = http().get(url).call().ok()?;
    let mime = resp
        .headers()
        .get("Content-Type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/png")
        .to_string();
    let bytes = resp
        .body_mut()
        .with_config()
        .limit(AVATAR_MAX_BYTES)
        .read_to_vec()
        .ok()?;
    if bytes.is_empty() {
        return None;
    }
    Some((bytes, mime))
}
