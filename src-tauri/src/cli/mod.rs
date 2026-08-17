mod add;
mod common;
mod list;
mod switch;

use tauri::Manager;
use tauri_plugin_cli::CliExt;

const CLI_COMMANDS: &[&str] = &["add", "list", "switch", "current", "help"];
const GUI_COMMANDS: &[&str] = &["open"];

/// True when this process should behave as a terminal command instead of
/// participating in the GUI single-instance handoff.
pub fn is_cli_invocation() -> bool {
    let mut args = std::env::args();
    let _program = args.next();

    let Some(first_arg) = args.next() else {
        return is_terminal_invocation();
    };

    matches!(first_arg.as_str(), "--help" | "-h" | "--version" | "-V")
        || CLI_COMMANDS.contains(&first_arg.as_str())
}

fn is_terminal_invocation() -> bool {
    use std::io::IsTerminal;

    std::io::stdin().is_terminal()
        || std::io::stdout().is_terminal()
        || std::io::stderr().is_terminal()
}

pub fn is_hidden_startup() -> bool {
    std::env::args().any(|arg| arg == "--hidden")
}

fn print_usage() {
    println!(
        "\
gitswitch - Manage Git identities, SSH keys, and active provider profiles from the command line

Usage:
  gitswitch [option]
  gitswitch <command> [arguments]

Commands:
  list                         List all saved profiles
  current                      Show the active profile
  switch <login>               Switch to a saved profile by login
  add --provider <name> --key <path>
                               Add a profile from an SSH private key
  open                         Open the GitSwitch desktop app

Options:
  --hidden                     Start the desktop app hidden in the system tray
  -h, --help                   Show help
  -V, --version                Show version

Examples:
  gitswitch list
  gitswitch current
  gitswitch switch octocat
  gitswitch add --provider github --key ~/.ssh/id_ed25519
  gitswitch open

Providers can be referenced by built-in id or display name, such as github, gitlab, or bitbucket.
"
    );
}

/// Handle CLI subcommands. Calls into existing service functions.
/// If a subcommand ran, exits the process; otherwise returns to let the app
/// continue with the GUI.
pub fn dispatch(app: &tauri::App) {
    if std::env::args().len() == 1 && is_terminal_invocation() {
        print_usage();
        std::process::exit(0);
    }

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
            name if GUI_COMMANDS.contains(&name) => {}
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
