use super::common::{fmt_profile, unwrap_or_exit, NO_PROFILES};

pub fn run(app: &tauri::AppHandle) {
    let profiles = unwrap_or_exit(crate::database::profiles::list_profiles(app.clone()));
    if profiles.is_empty() {
        println!("{NO_PROFILES}");
        return;
    }
    let active = crate::database::active::get_active_state(app.clone())
        .ok()
        .and_then(|s| s.active_id);

    for p in &profiles {
        let marker = if active.as_deref() == Some(&p.id) { "* " } else { "  " };
        println!("{marker}{}", fmt_profile(p));
    }
}
