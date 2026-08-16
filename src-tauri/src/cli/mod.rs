mod add;
mod help;
mod list;
mod switch;

use crate::models::StoredProfile;
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
                let login = sub
                    .matches
                    .args
                    .get("login")
                    .and_then(|a| a.value.as_str().map(String::from));
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
                let provider = sub
                    .matches
                    .args
                    .get("provider")
                    .and_then(|a| a.value.as_str().map(String::from));
                let key = sub
                    .matches
                    .args
                    .get("key")
                    .and_then(|a| a.value.as_str().map(String::from));
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

// ── shared helpers used across subcommands ──

/// One-line format for a profile, reused by list/switch/current/add.
fn fmt_profile(p: &StoredProfile) -> String {
    format!(
        "{} ({}) <{}> [{}]",
        p.login, p.display_name, p.git_email, p.provider_name
    )
}

/// Unwrap a service Result or print the error and exit.
fn unwrap_or_exit<T>(result: Result<T, String>) -> T {
    match result {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

const NO_PROFILES: &str =
    "No profiles available. Add one with: gitswitch add --provider <name> --key <path>";
