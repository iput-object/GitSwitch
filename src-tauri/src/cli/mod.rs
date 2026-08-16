mod add;
mod common;
mod list;
mod switch;

use tauri::Manager;
use tauri_plugin_cli::CliExt;

const CLI_COMMANDS: &[&str] = &["add", "list", "switch", "current", "help"];

/// True when this process should behave as a terminal command instead of
/// participating in the GUI single-instance handoff.
pub fn is_cli_invocation() -> bool {
    let Some(first_arg) = std::env::args().nth(1) else {
        return false;
    };

    matches!(first_arg.as_str(), "--help" | "-h" | "--version" | "-V")
        || CLI_COMMANDS.contains(&first_arg.as_str())
}

pub fn is_hidden_startup() -> bool {
    std::env::args().any(|arg| arg == "--hidden")
}

/// Handle CLI subcommands. Calls into existing service functions.
/// If a subcommand ran, exits the process; otherwise returns to let the app
/// continue with the GUI.
pub fn dispatch(app: &tauri::App) {
    let matches = match app.cli().matches() {
        Ok(matches) => matches,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    };

    if let Some(help_text) = matches.args.get("help").and_then(|a| a.value.as_str()) {
        print!("{help_text}");
        std::process::exit(0);
    }

    if matches.args.contains_key("version") {
        println!("gitswitch {}", env!("CARGO_PKG_VERSION"));
        std::process::exit(0);
    }

    if let Some(sub) = matches.subcommand.as_ref() {
        match sub.name.as_str() {
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
