use base64::{engine::general_purpose, Engine as _};
use std::time::{SystemTime, UNIX_EPOCH};

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
    let mut resp = ureq::get(url)
        .header("User-Agent", "GitSwitch")
        .call()
        .ok()?;
    let mime = resp
        .headers()
        .get("Content-Type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/png")
        .to_string();
    let bytes = resp.body_mut().read_to_vec().ok()?;
    if bytes.is_empty() {
        return None;
    }
    Some((bytes, mime))
}
