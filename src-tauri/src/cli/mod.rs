mod add;
mod common;
mod help;
mod list;
mod switch;

use tauri::Manager;

/// Handle CLI subcommands. Calls into existing service functions.
/// If a subcommand ran, exits the process; otherwise returns to let the app
/// continue with the GUI.
pub fn dispatch(app: &tauri::App) {
    let Ok(matches) = app.cli().matches() else {
        return;
    };

    if let Some((name, sub)) = matches.subcommand.as_ref() {
        match name.as_str() {
            "list" => {
                list::run(app.handle());
                std::process::exit(0);
            }
            "switch" => {
                let login = common::get_arg(sub, "login");
                match login {
                    Some(l) => switch::run(app.handle(), &l),
                    None => {
                        eprintln!("Usage: gitswitch switch <login>");
                        std::process::exit(1);
                    }
                }
                std::process::exit(0);
            }
            "current" => {
                switch::current(app.handle());
                std::process::exit(0);
            }
            "add" => {
                let provider = common::get_arg(sub, "provider");
                let key = common::get_arg(sub, "key");
                match (provider, key) {
                    (Some(p), Some(k)) => add::run(app.handle(), &p, &k),
                    _ => {
                        eprintln!("Usage: gitswitch add --provider <name> --key <path>");
                        std::process::exit(1);
                    }
                }
                std::process::exit(0);
            }
            "help" => {
                help::run();
                std::process::exit(0);
            }
            _ => {}
        }
    }

    // --hidden: start minimized to tray
    if matches
        .args
        .get("hidden")
        .and_then(|a| a.value.as_bool())
        .unwrap_or(false)
    {
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.hide();
        }
    }
}

