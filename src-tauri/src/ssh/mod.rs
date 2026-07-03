pub mod config;
pub(crate) mod fs;
pub(crate) mod identify;
pub(crate) mod keys;

pub use fs::{expand_path, ssh_dir};
pub use identify::ssh_identify;
pub use keys::{read_public_key, resolve_key_input};

// `(async)` runs this off the main thread (spawns a file manager).
#[tauri::command(async)]
pub fn open_ssh_folder(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let dir = fs::ssh_dir()?;
    app.opener()
        .open_path(dir.to_string_lossy().into_owned(), None::<String>)
        .map_err(|e| format!("Could not open folder: {e}"))
}
