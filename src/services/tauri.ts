// Single typed surface for every Rust command. Keeps invoke() command-name
// strings and their return types in one place instead of scattered inline.
import { invoke } from "@tauri-apps/api/core";

// ── Backend contract types (mirror the Rust structs) ─────────────────────────

export type StoredProfile = {
  id: string;
  displayName: string;
  gitName: string;
  gitEmail: string;
  githubLogin: string;
  /** Locally cached avatar as a data: URI. */
  avatar: string | null;
  keyPath: string;
  publicKey: string;
  /** Computed at read time: the key file this profile points at is gone. */
  keyMissing: boolean;
  publicRepos: number | null;
  followers: number | null;
  commits: number | null;
};

export type NewProfile = {
  displayName: string;
  gitName: string;
  gitEmail: string;
  githubLogin: string;
  avatarUrl: string | null;
  keyPath: string;
  publicKey: string;
};

export type ActiveState = {
  matchedId: string | null;
  gitName: string | null;
  gitEmail: string | null;
  keyPath: string | null;
  unmanagedLogin: string | null;
};

export type GithubAccount = {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  suggestedEmail: string;
  keyPath: string;
  publicKey: string;
  managed: boolean;
};

export type GeneratedKey = { keyPath: string; publicKey: string };

export type HostInfo = { username: string; avatar: string | null };

/** Result of a profile health check: see `ssh::check_profile`. */
export type ProfileHealth = "ok" | "broken" | "unknown";

// ── Command bridge ───────────────────────────────────────────────────────────

export const api = {
  // Profiles
  listProfiles: () => invoke<StoredProfile[]>("list_profiles"),
  addProfile: (profile: NewProfile) => invoke<StoredProfile>("add_profile", { profile }),
  refreshProfile: (id: string) => invoke<StoredProfile>("refresh_profile", { id }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  deleteAllProfiles: () => invoke<void>("delete_all_profiles"),
  updateProfileDetails: (id: string, displayName: string, gitEmail: string) =>
    invoke<void>("update_profile_details", { id, displayName, gitEmail }),
  checkProfile: (keyPath: string, login: string) =>
    invoke<ProfileHealth>("check_profile", { keyPath, login }),

  // Active identity
  reconcileActive: () => invoke<ActiveState>("reconcile_active"),
  getActiveProfile: () => invoke<string | null>("get_active_profile"),
  activateProfile: (id: string) => invoke<void>("activate_profile", { id }),

  // SSH / GitHub
  generateSshKey: () => invoke<GeneratedKey>("generate_ssh_key"),
  commitKey: (keyPath: string, login: string) =>
    invoke<string>("commit_key", { keyPath, login }),
  syncGithub: (input: string) => invoke<GithubAccount>("sync_github", { input }),
  openSshFolder: () => invoke<void>("open_ssh_folder"),

  // Host
  getHostInfo: () => invoke<HostInfo>("get_host_info"),

  // Git
  gitConfig: () => invoke<string>("git_config"),
};
