#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;
mod database;
mod git;
mod host;
mod models;
mod paths;
mod provider;
mod ssh;
mod tray;
mod utils;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            cli::dispatch(app);

            let handle = app.handle().clone();
            app.handle().run_on_main_thread(move || {
                if let Err(e) = tray::create(&handle) {
                    eprintln!("tray init failed: {e}");
                }
            })?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            host::get_host_info,
            git::git_config,
            ssh::keys::generate_ssh_key,
            ssh::keys::commit_key,
            ssh::open_ssh_folder,
            provider::sync_provider,
            database::providers::list_providers,
            database::providers::add_provider,
            database::profiles::add_profile,
            database::profiles::list_profiles,
            database::profiles::delete_profile,
            database::profiles::delete_all_profiles,
            database::profiles::refresh_profile,
            database::profiles::get_profile_defaults,
            database::profiles::reset_profile_defaults,
            database::profiles::update_profile_details,
            database::active::get_active_state,
            database::active::reconcile_active,
            database::active::activate_profile,
            database::active::activate_partial,
            database::profiles::update_profile_details,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
