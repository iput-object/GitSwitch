use super::common::{fmt_profile, unwrap_or_exit, NO_PROFILES};

pub fn run(app: &tauri::AppHandle, login: &str) {
    let profiles = unwrap_or_exit(crate::database::profiles::list_profiles(app.clone()));
    let found = profiles.iter().find(|p| p.login.eq_ignore_ascii_case(login));

    let Some(profile) = found else {
        eprintln!("No profile found with login '{login}'.");
        if profiles.is_empty() {
            eprintln!("{NO_PROFILES}");
        } else {
            eprintln!("Available logins:");
            for p in &profiles {
                eprintln!("  {} [{}]", p.login, p.provider_name);
            }
        }
        std::process::exit(1);
    };

    unwrap_or_exit(crate::database::active::activate(app, &profile.id));
    println!("Switched to {}", fmt_profile(profile));
}

pub fn current(app: &tauri::AppHandle) {
    let state = unwrap_or_exit(crate::database::active::get_active_state(app.clone()));
    let Some(active_id) = &state.active_id else {
        println!("No active profile.");
        return;
    };
    // read_one fetches a single profile by id — no need to load all profiles
    match crate::database::core::read_one(
        &unwrap_or_exit(crate::database::core::open(app)),
        active_id,
    ) {
        Ok(p) => println!("{}", fmt_profile(&p)),
        Err(_) => println!("Active profile '{active_id}' not found in database."),
    }
}
