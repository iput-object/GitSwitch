mod db;
mod git;
mod github;
mod host;
mod paths;
mod ssh;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            tray::create(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Keep GitSwitch alive in the tray: closing the window hides it.
            // Use "Quit GitSwitch" in the tray to actually exit.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            host::get_host_info,
            ssh::generate_ssh_key,
            ssh::commit_key,
            ssh::open_ssh_folder,
            github::sync_github,
            db::add_profile,
            db::list_profiles,
            db::delete_profile,
            db::refresh_profile,
            db::set_active_profile,
            db::get_active_profile,
            db::reconcile_active,
            db::activate_profile,
            db::update_profile_details,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
