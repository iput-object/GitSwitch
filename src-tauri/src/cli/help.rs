pub fn run() {
    println!(
        "GitSwitch — manage multiple git provider accounts

USAGE:
    gitswitch [OPTIONS] [COMMAND]

COMMANDS:
    add --provider <name>       Add a new profile from an SSH key
        --key <path>
    list                        List all saved profiles
    switch <login>              Switch to a profile by login name
    current                     Show the currently active profile
    help                        Show this help message

OPTIONS:
    --hidden    Start minimized to system tray
    --help      Show help information
    --version   Show version information

EXAMPLES:
    gitswitch add --provider github --key ~/.ssh/id_ed25519
    gitswitch list
    gitswitch switch octocat
    gitswitch current"
    );
}
