//! System tray: a live menu of accounts (active one checked). Clicking one
//! switches identity with the same logic as the window, no UI needed.

use tauri::{
    menu::{CheckMenuItemBuilder, Menu, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Wry,
};

const OPEN_ID: &str = "__open";
const QUIT_ID: &str = "__quit";
const NONE_ID: &str = "__none";

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let (profiles, active) = crate::db::list_for_tray(app);
    let mut items = tauri::menu::MenuBuilder::new(app);

    if profiles.is_empty() {
        let empty = MenuItemBuilder::with_id(NONE_ID, "No accounts yet")
            .enabled(false)
            .build(app)?;
        items = items.item(&empty);
    } else {
        for (id, name) in &profiles {
            let entry = CheckMenuItemBuilder::with_id(id.clone(), name)
                .checked(active.as_deref() == Some(id.as_str()))
                .build(app)?;
            items = items.item(&entry);
        }
    }

    let open = MenuItemBuilder::with_id(OPEN_ID, "Open GitSwitch").build(app)?;
    let quit = MenuItemBuilder::with_id(QUIT_ID, "Quit GitSwitch").build(app)?;
    items.separator().item(&open).item(&quit).build()
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        // Order matters on Windows: a window hidden via `hide()` keeps its
        // taskbar-skip / minimized state, so `show()` alone can restore it
        // off-screen or unfocused -> looks like "nothing happened". Clear
        // skip-taskbar, un-minimize, then force focus to surface it.
        let _ = window.set_skip_taskbar(false);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn on_menu_event(app: &AppHandle, id: &str) {
    match id {
        OPEN_ID => show_main(app),
        QUIT_ID => app.exit(0),
        NONE_ID => {}
        profile_id => {
            // Switching runs git config + ~/.ssh/config writes (subprocess +
            // file I/O). Menu events fire on the main/event thread, so doing it
            // inline blocks the whole GTK loop while it runs -- and if a git/ssh
            // call ever stalls, the tray freezes for good (later clicks, even
            // Quit, never get processed). Hand it to a worker so the menu stays
            // live; `rebuild` and `emit` are both safe from another thread.
            let app = app.clone();
            let profile_id = profile_id.to_string();
            std::thread::spawn(move || {
                if crate::db::activate(&app, &profile_id).is_ok() {
                    let _ = app.emit("active-changed", profile_id);
                }
                rebuild(&app);
            });
        }
    }
}

/// Create the tray icon and its menu (called once at startup).
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    // Never register twice: a lingering tray (hot-reload, or a still-running
    // prior instance) would otherwise trigger libayatana "already exported"
    // warnings on the StatusNotifierItem D-Bus path.
    if app.tray_by_id("main").is_some() {
        return Ok(());
    }

    let menu = build_menu(app)?;
    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("GitSwitch")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| on_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            // Log every tray event so it's possible to tell, from the console,
            // whether Windows is even emitting left-clicks (a known-flaky path
            // when a menu is attached) vs. the window failing to surface.
            eprintln!("tray event: {event:?}");

            let surface = matches!(
                event,
                // Single left-click release: the primary "open" gesture.
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
                // Double-click is emitted as its own event on Windows and does
                // NOT come with a preceding usable Click on some versions, so
                // handle it explicitly as a fallback.
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                }
            );

            if surface {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

/// Rebuild the menu after accounts or the active selection change. Dispatched
/// to the main thread since some platforms require menu edits there.
pub fn rebuild(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(tray) = handle.tray_by_id("main") {
            if let Ok(menu) = build_menu(&handle) {
                let _ = tray.set_menu(Some(menu));
            }
            // set_menu makes libappindicator (Linux) re-register the tray item,
            // which drops the icon -> GNOME shows its "⋮" placeholder / a ghost
            // duplicate. Re-apply the icon so it survives every rebuild.
            if let Some(icon) = handle.default_window_icon().cloned() {
                let _ = tray.set_icon(Some(icon));
            }
        }
    });
}
