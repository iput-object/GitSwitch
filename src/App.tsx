import "./styles/global.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence } from "motion/react";
import { api, type StoredProfile } from "./services/tauri";
import Background from "./components/Background";
import Splash from "./components/Splash";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import AddProfile from "./components/AddProfile";
import Profiles from "./components/Profiles";
import SSHKeys from "./components/SSHKeys";
import Settings from "./components/Settings";

type Screen = "welcome" | "add-profile" | "profiles" | "ssh-keys" | "settings";

type Profile = StoredProfile;

export type Untracked = {
  login: string | null;
  email: string | null;
  keyPath: string | null;
};

const ONBOARDED_KEY = "gitswitch.onboarded";
const BROKEN_KEY = "gitswitch.broken";

// Last-known broken profile ids, so badges paint immediately on reopen instead
// of waiting for a fresh GitHub round trip. Reconciled in the background below.
const loadBrokenCache = (): Set<string> => {
  try {
    const raw = localStorage.getItem(BROKEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    !import.meta.env.DEV && localStorage.getItem(ONBOARDED_KEY)
      ? "profiles"
      : "welcome"
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true); // first DB read in flight
  // Ids of profiles that won't work, painted from the last-known cached set.
  // Reconciled on demand via refresh, not on open.
  const [broken] = useState<Set<string>>(loadBrokenCache);
  // Spins the reload icon while a refresh-all is running; ref guards re-entry.
  const [refreshingAll, setRefreshingAll] = useState(false);
  const refreshingAllRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [untracked, setUntracked] = useState<Untracked | null>(null);
  const [pendingInput, setPendingInput] = useState("");
  // Splash only appears if the first load is slow enough to notice, so a fast
  // launch never flashes it.
  const [showSplash, setShowSplash] = useState(false);
  // The onboarding identity probe, awaited by the Welcome Continue button so it
  // can pre-fill the detected key. Resolves to a key path (or "").
  const reconcileRef = useRef<Promise<string>>(Promise.resolve(""));

  // Reveal the splash only when the initial load outlasts this grace period.
  useEffect(() => {
    if (!loading) {
      setShowSplash(false);
      return;
    }
    const t = setTimeout(() => setShowSplash(true), 200);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    // Onboarding: there are no saved profiles to show yet. Just probe the
    // machine's current identity so Welcome → Add Profile can pre-fill it.
    // Stash the probe so the Continue button can wait on it (capped below).
    if (screen === "welcome") {
      setLoading(false);
      reconcileRef.current = api.reconcileActive()
        .then((s) => {
          if (s.unmanagedLogin || s.keyPath || s.gitEmail) {
            setUntracked({
              login: s.unmanagedLogin,
              email: s.gitEmail,
              keyPath: s.keyPath,
            });
          }
          return s.keyPath ?? "";
        })
        .catch(() => "");
      return;
    }

    // Returning user: do nothing but read the list from the DB and show it.
    // No GitHub probes, no live identity reconcile — broken badges paint from
    // the cached set, and the refresh button pulls fresh data on demand.
    api.listProfiles()
      .then((list) => setProfiles(list))
      .catch(() => {})
      .finally(() => setLoading(false));

    api.getActiveProfile()
      .then(setActiveId)
      .catch(() => {});
  }, []);

  useEffect(() => {
    import("@tauri-apps/api/tray").then(({ TrayIcon }) => {
      const showTray = localStorage.getItem("gitswitch.showTrayIcon") !== "false";
      if (!showTray) {
        TrayIcon.getById("main").then((tray) => {
          if (tray) tray.setVisible(false);
        }).catch(() => {});
      }
    });

    const unlisten = listen<string>("active-changed", (e) => {
      setActiveId(e.payload);
      setUntracked(null);
    });
    return () => {
      unlisten.then((off) => off());
    };
  }, []);

  function openAdd(prefill = "") {
    setPendingInput(prefill);
    setScreen("add-profile");
  }

  function handleImport() {
    openAdd(untracked?.keyPath ?? "");
  }

  function handleSelect(id: string) {
    setActiveId(id);
    setUntracked(null);

    api.activateProfile(id).catch(() => {});

    api.refreshProfile(id)
      .then((updated) =>
        setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)))
      )
      .catch(() => {});
  }

  function handleDelete(id: string) {
    if (id === activeId) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    api.deleteProfile(id).catch(() => {});
  }

  async function handleRefresh(id: string) {
    const updated = await api.refreshProfile(id);
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  async function handleRefreshAll() {
    if (refreshingAllRef.current) return; // ignore re-trigger while in flight
    refreshingAllRef.current = true;
    setRefreshingAll(true);
    // Let the spinner paint a frame before the (network-bound) refresh starts,
    // so the click feels instant instead of stalling on the first request.
    await new Promise(requestAnimationFrame);
    const started = Date.now();
    try {
      for (const p of profiles) {
        await handleRefresh(p.id).catch(() => {});
      }
    } finally {
      // Keep the icon spinning for at least one rotation so a fast refresh
      // still reads as a refresh instead of a flicker.
      const elapsed = Date.now() - started;
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
      refreshingAllRef.current = false;
      setRefreshingAll(false);
    }
  }

  // Ctrl/Cmd+R refreshes all profiles (same as the reload icon).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleRefreshAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profiles]);

  async function handleUpdateProfile(id: string, displayName: string, gitEmail: string) {
    try {
      await api.updateProfileDetails(id, displayName, gitEmail);
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, displayName, gitEmail } : p))
      );
    } catch (e) {
      console.error(e);
    }
  }

  function handleOpenGitHub() {
    const active = profiles.find((p) => p.id === activeId);
    if (active && active.githubLogin) {
      openUrl(`https://github.com/${active.githubLogin}`).catch(() => {});
    } else {
      openUrl("https://github.com").catch(() => {});
    }
  }

  async function handleOpenSSH() {
    try {
      await api.openSshFolder();
    } catch (err) {
      alert(String(err));
      console.error(err);
    }
  }

  async function completeWelcome() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    // First run: wait for the identity probe so Add Profile lands pre-synced.
    // Keep the spinner visible briefly, but never let a slow/hung probe block
    // onboarding — fall back to whatever we have after the cap.
    const withCap = <T,>(p: Promise<T>, ms: number, fallback: T) =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

    const [keyPath, list] = await Promise.all([
      withCap(reconcileRef.current, 4000, ""),
      api.listProfiles().catch(() => [] as Profile[]),
      new Promise((r) => setTimeout(r, 450)), // minimum so the spinner is seen
    ]);

    // Already have accounts? Skip Add Profile and drop straight into the list.
    if (list.length > 0) {
      setProfiles(list);
      api.getActiveProfile().then(setActiveId).catch(() => {});
      setScreen("profiles");
      return;
    }

    openAdd(keyPath || untracked?.keyPath || "");
  }

  function handleSaveProfile(profile: Profile) {
    setProfiles((prev) => [...prev, profile]);
    setUntracked(null);
    setActiveId((current) => {
      if (current) return current;
      api.activateProfile(profile.id).catch(() => {});
      return profile.id;
    });
    setScreen("profiles");
  }

  async function handleClearAllProfiles() {
    setProfiles([]);
    setActiveId(null);
    setUntracked(null);
    setScreen("welcome");
  }

  // The in-use identity surfaced as a notification: present only when it isn't
  // already saved (matched by login, email, or key path — all case-insensitive).
  const addableIdentity = useMemo<Untracked | null>(() => {
    if (!untracked || (!untracked.login && !untracked.email)) return null;
    const norm = (s: string | null | undefined) => s?.trim().toLowerCase() ?? "";
    const tracked = profiles.some(
      (p) =>
        (!!untracked.login && norm(p.githubLogin) === norm(untracked.login)) ||
        (!!untracked.email && norm(p.gitEmail) === norm(untracked.email)) ||
        (!!untracked.keyPath && norm(p.keyPath) === norm(untracked.keyPath))
    );
    return tracked ? null : untracked;
  }, [untracked, profiles]);

  const showLayout = screen !== "welcome" && screen !== "add-profile";

  return (
    <div className="relative h-screen w-screen bg-neutral-950 rounded-2xl overflow-hidden flex flex-col font-sans">
      <Background />

      <AnimatePresence>{showSplash && <Splash />}</AnimatePresence>

      {/* Navbar is always visible unless on welcome/add-profile (though we could show it there too, let's keep it clean) */}
      {showLayout && (
        <Navbar
          onAdd={() => openAdd()}
          onRefresh={handleRefreshAll}
          refreshing={refreshingAll}
          notification={addableIdentity}
          onImport={handleImport}
        />
      )}

      <div className="relative flex min-h-0 flex-1">
        {showLayout && (
          <Sidebar
            activePage={screen}
            onNavigate={(page) => setScreen(page as Screen)}
            onOpenGitHub={handleOpenGitHub}
            onOpenSSH={handleOpenSSH}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {screen === "welcome" && <Welcome onContinue={completeWelcome} />}

          {screen === "add-profile" && (
            <AddProfile
              initialInput={pendingInput}
              existingLogins={profiles.map((p) => p.githubLogin)}
              showCancel={profiles.length > 0}
              onCancel={() => setScreen("profiles")}
              onSave={handleSaveProfile}
            />
          )}

          {screen === "profiles" && (
            <Profiles
              profiles={profiles}
              broken={broken}
              loading={loading}
              activeId={activeId}
              onAdd={() => openAdd()}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
              onUpdate={handleUpdateProfile}
              onOpenGitHub={handleOpenGitHub}
            />
          )}

          {screen === "ssh-keys" && (
            <SSHKeys profiles={profiles} />
          )}

          {screen === "settings" && (
            <Settings onClearAllProfiles={handleClearAllProfiles} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
