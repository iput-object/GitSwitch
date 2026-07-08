// Single typed surface for every Rust command. Keeps invoke() command-name
// strings and their return types in one place instead of scattered inline.
import { invoke } from "@tauri-apps/api/core";

// ── Backend contract types (mirror the Rust structs) ─────────────────────────

/** A git host GitSwitch can talk to (GitHub/GitLab/Bitbucket or self-hosted). */
export type Provider = {
  id: string;
  /** "github" | "gitlab" | "bitbucket" — decides banner + API behavior. */
  kind: string;
  name: string;
  host: string;
  apiBaseUrl: string | null;
  selfHosted: boolean;
};

export type NewProvider = {
  kind: string;
  name: string;
  host: string;
  apiBaseUrl: string | null;
  selfHosted: boolean;
};

export type StoredProfile = {
  id: string;
  displayName: string;
  gitName: string;
  gitEmail: string;
  providerId: string;
  login: string;
  /** Locally cached avatar as a data: URI. */
  avatar: string | null;
  keyPath: string;
  publicKey: string;
  /** Computed at read time: the key file this profile points at is gone. */
  keyMissing: boolean;
  publicRepos: number | null;
  followers: number | null;
  commits: number | null;
  /** Joined provider fields, for display and links. */
  providerName: string;
  providerHost: string;
  providerKind: string;
};

export type NewProfile = {
  displayName: string;
  gitName: string;
  gitEmail: string;
  providerId: string;
  login: string;
  avatarUrl: string | null;
  keyPath: string;
  publicKey: string;
};

/** Which profile is wired into a provider's SSH host block (partially active). */
export type ProviderActive = { providerId: string; profileId: string };

/** An in-use key on a known host that isn't one of our saved profiles. */
export type UntrackedIdentity = {
  providerId: string;
  host: string;
  login: string | null;
  keyPath: string;
};

export type ActiveState = {
  /** The single fully-active profile that owns the global git commit identity. */
  activeId: string | null;
  /** The partially-active set: provider -> profile in that host's SSH block. */
  partial: ProviderActive[];
  gitName: string | null;
  gitEmail: string | null;
  untracked: UntrackedIdentity[];
};

export type ProviderAccount = {
  providerId: string;
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

// ── Command bridge ───────────────────────────────────────────────────────────

export const api = {
  // Providers
  listProviders: () => invoke<Provider[]>("list_providers"),
  addProvider: (provider: NewProvider) =>
    invoke<Provider>("add_provider", { provider }),

  // Profiles
  listProfiles: () => invoke<StoredProfile[]>("list_profiles"),
  addProfile: (profile: NewProfile) =>
    invoke<StoredProfile>("add_profile", { profile }),
  refreshProfile: (id: string) =>
    invoke<StoredProfile>("refresh_profile", { id }),
  getProfileDefaults: (id: string) =>
    invoke<{ display_name: string; git_email: string }>("get_profile_defaults", { id }),
  resetProfileDefaults: (id: string) =>
    invoke<StoredProfile>("reset_profile_defaults", { id }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  deleteAllProfiles: () => invoke<void>("delete_all_profiles"),
  updateProfileDetails: (id: string, displayName: string, gitEmail: string) =>
    invoke<void>("update_profile_details", { id, displayName, gitEmail }),

  // Active identity
  reconcileActive: () => invoke<ActiveState>("reconcile_active"),
  getActiveState: () => invoke<ActiveState>("get_active_state"),
  activateProfile: (id: string) => invoke<void>("activate_profile", { id }),
  activateProfilePartial: (id: string) =>
    invoke<void>("activate_partial", { id }),

  // SSH / provider sync
  generateSshKey: () => invoke<GeneratedKey>("generate_ssh_key"),
  commitKey: (keyPath: string, login: string) =>
    invoke<string>("commit_key", { keyPath, login }),
  syncProvider: (providerId: string, input: string) =>
    invoke<ProviderAccount>("sync_provider", { providerId, input }),
  openSshFolder: () => invoke<void>("open_ssh_folder"),

  // Host
  getHostInfo: () => invoke<HostInfo>("get_host_info"),

  // Git
  gitConfig: () => invoke<string>("git_config"),
};
