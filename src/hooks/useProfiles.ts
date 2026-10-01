import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  api,
  type ActiveState,
  type ProviderActive,
  type StoredProfile,
} from "../services/tauri";

/** An in-use identity on this machine that isn't saved as a profile yet. */
export type Untracked = {
  providerId: string | null;
  login: string | null;
  email: string | null;
  keyPath: string | null;
};

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

/** The first unsaved in-use key from a reconcile, or null when there's none. */
export function untrackedFrom(state: ActiveState): Untracked | null {
  const first = state.untracked[0];
  if (!first && !state.gitEmail) return null;
  return {
    providerId: first?.providerId ?? null,
    login: first?.login ?? null,
    email: state.gitEmail,
    keyPath: first?.keyPath ?? null,
  };
}

/**
 * Saved profiles plus the machine's live identity: which profile is fully
 * active, which are SSH-active per provider, and anything that drifted. Every
 * action that changes identity lives here so screens only call into it.
 */
export function useProfiles({ loadOnMount }: { loadOnMount: boolean }) {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [loading, setLoading] = useState(loadOnMount); // first DB read in flight
  const [activeId, setActiveId] = useState<string | null>(null);
  // The partially-active set: profiles whose provider host block points at
  // their key, even though another profile owns the global commit identity.
  const [partial, setPartial] = useState<ProviderActive[]>([]);
  const [untracked, setUntracked] = useState<Untracked | null>(null);
  // The live global `user.email`, to spot edits made outside GitSwitch.
  const [liveGitEmail, setLiveGitEmail] = useState<string | null>(null);
  // Set when the backend reports a switch that didn't fully take effect.
  const [unverifiedSwitch, setUnverifiedSwitch] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const refreshingAllRef = useRef(false); // guards re-entry while in flight

  function applyActiveState(state: ActiveState) {
    setActiveId(state.activeId);
    setPartial(state.partial);
    setLiveGitEmail(state.gitEmail);
  }

  // Cheap (DB read + git config, no network), so safe after any activation.
  function refreshActiveState() {
    api.getActiveState().then(applyActiveState).catch(() => {});
  }

  // Probe which keys ~/.ssh/config actually uses (one SSH call per unknown
  // key), so the bell can offer to add them. Network-bound: on demand only.
  async function reconcileIdentity() {
    const state = await api.reconcileActive();
    applyActiveState(state);
    setUntracked(untrackedFrom(state));
  }

  // Returning user: read the list from the DB and show it. No provider probes;
  // the refresh button pulls fresh data on demand.
  async function load() {
    try {
      setProfiles(await api.listProfiles());
    } catch {
      /* keep the empty list */
    } finally {
      setLoading(false);
    }
    refreshActiveState();
  }

  useEffect(() => {
    if (loadOnMount) load();

    const offActiveChanged = listen<string>("active-changed", (event) => {
      setActiveId(event.payload);
      setUntracked(null);
      setUnverifiedSwitch(null);
      refreshActiveState();
    });
    const offUnverified = listen<string>("switch-unverified", (event) => {
      setUnverifiedSwitch(event.payload);
    });
    // Re-read the live identity whenever the window regains focus, so a
    // `git config` run in a terminal meanwhile shows up.
    const offFocus = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) refreshActiveState();
    });
    return () => {
      for (const off of [offActiveChanged, offUnverified, offFocus]) {
        off.then((stop) => stop()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replaceProfile(updated: StoredProfile) {
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function activate(id: string) {
    setActiveId(id);
    setUntracked(null);
    setUnverifiedSwitch(null);
    // Optimistic, so the drift notice doesn't flash before the state re-read.
    setLiveGitEmail(profiles.find((p) => p.id === id)?.gitEmail ?? null);

    api.activateProfile(id).then(refreshActiveState).catch(() => {});
    api.refreshProfile(id).then(replaceProfile).catch(() => {});
  }

  // Wire this profile's key into its provider's SSH host block only: pushes
  // and pulls to that provider authenticate as it, but the global commit
  // identity is left untouched. Surfaces as the "SSH active" badge.
  function activatePartial(id: string) {
    api.activateProfilePartial(id).then(refreshActiveState).catch(() => {});
  }

  function reapplyActive() {
    if (!activeId) return;
    setUnverifiedSwitch(null);
    api.activateProfile(activeId).then(refreshActiveState).catch(() => {});
  }

  function remove(id: string) {
    if (id === activeId) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    api.deleteProfile(id).catch(() => {
      // Optimistic removal failed: resync so the row comes back.
      api.listProfiles().then(setProfiles).catch(() => {});
    });
  }

  async function refresh(id: string) {
    replaceProfile(await api.refreshProfile(id));
  }

  async function refreshAll() {
    if (refreshingAllRef.current) return;
    refreshingAllRef.current = true;
    setRefreshingAll(true);
    // Let the spinner paint a frame before the (network-bound) refresh starts,
    // so the click feels instant instead of stalling on the first request.
    await new Promise(requestAnimationFrame);
    const started = Date.now();
    try {
      for (const p of profiles) {
        await refresh(p.id).catch(() => {});
      }
      await reconcileIdentity().catch(() => {});
    } finally {
      // Keep the icon spinning for at least one rotation so a fast refresh
      // still reads as a refresh instead of a flicker.
      const elapsed = Date.now() - started;
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
      refreshingAllRef.current = false;
      setRefreshingAll(false);
    }
  }

  async function updateDetails(id: string, displayName: string, gitEmail: string) {
    try {
      await api.updateProfileDetails(id, displayName, gitEmail);
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, displayName, gitEmail } : p))
      );
      // Editing the active profile re-applies it; pick up the new identity.
      refreshActiveState();
    } catch (error) {
      console.error(error);
    }
  }

  function addSaved(profile: StoredProfile) {
    setProfiles((prev) => [...prev, profile]);
    setUntracked(null);
    // The first saved profile becomes active.
    if (!activeId) {
      setActiveId(profile.id);
      setLiveGitEmail(profile.gitEmail);
      api.activateProfile(profile.id).then(refreshActiveState).catch(() => {});
    }
  }

  function clearAll() {
    setProfiles([]);
    setActiveId(null);
    setPartial([]);
    setUntracked(null);
  }

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId]
  );

  // Profiles that won't work: the key file they point at is gone. Computed by
  // the backend on every read, so a refresh re-checks it.
  const missingKeyProfiles = useMemo(() => profiles.filter((p) => p.keyMissing), [profiles]);
  const brokenIds = useMemo(
    () => new Set(missingKeyProfiles.map((p) => p.id)),
    [missingKeyProfiles]
  );

  // Profile ids whose provider host block currently points at their key.
  const partialIds = useMemo(() => new Set(partial.map((p) => p.profileId)), [partial]);

  // The in-use identity worth offering: only when it isn't already saved
  // (matched by login, email, or key path, all case-insensitive).
  const addableIdentity = useMemo<Untracked | null>(() => {
    if (!untracked || (!untracked.login && !untracked.email)) return null;
    const tracked = profiles.some(
      (p) =>
        (!!untracked.providerId &&
          p.providerId === untracked.providerId &&
          !!untracked.login &&
          normalize(p.login) === normalize(untracked.login)) ||
        (!!untracked.email && normalize(p.gitEmail) === normalize(untracked.email)) ||
        (!!untracked.keyPath && normalize(p.keyPath) === normalize(untracked.keyPath))
    );
    return tracked ? null : untracked;
  }, [untracked, profiles]);

  // Someone changed the global identity behind GitSwitch's back.
  const identityDrifted =
    !!activeProfile &&
    !unverifiedSwitch &&
    normalize(liveGitEmail) !== normalize(activeProfile.gitEmail);

  return {
    profiles,
    setProfiles,
    loading,
    activeId,
    activeProfile,
    partialIds,
    brokenIds,
    missingKeyProfiles,
    untracked,
    setUntracked,
    addableIdentity,
    liveGitEmail,
    identityDrifted,
    unverifiedSwitch,
    refreshingAll,
    refreshActiveState,
    activate,
    activatePartial,
    reapplyActive,
    remove,
    refresh,
    refreshAll,
    updateDetails,
    addSaved,
    clearAll,
  };
}

export type ProfilesStore = ReturnType<typeof useProfiles>;
