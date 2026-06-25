import "./styles/global.css";
import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, type StoredProfile } from "./services/tauri";
import Background from "./components/Background";
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

function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    !import.meta.env.DEV && localStorage.getItem(ONBOARDED_KEY)
      ? "profiles"
      : "welcome"
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true); // first DB read in flight
  // Ids of profiles that won't work: key file gone, or key removed from GitHub.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  // Spins the reload icon while a refresh-all is running; ref guards re-entry.
  const [refreshingAll, setRefreshingAll] = useState(false);
  const refreshingAllRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [untracked, setUntracked] = useState<Untracked | null>(null);
  const [pendingInput, setPendingInput] = useState("");

  useEffect(() => {
    // Local DB read only — paints the list immediately. Stats/avatars are
    // cached here, so we do NOT re-fetch GitHub on open (that was the load).
    // Use the refresh button to pull fresh stats.
    api.listProfiles()
      .then((list) => {
        setProfiles(list);
        setLoading(false);
        // Health-check the profiles one at a time, after the list has painted.
        // Each GitHub probe spawns an `ssh` subprocess; firing them all at once
        // spikes CPU and lags the freshly-opened window, so we serialize and
        // wait for idle first. The await loop yields between each, keeping the
        // UI responsive.
        const flag = (id: string) => setBroken((s) => new Set(s).add(id));
        const run = async () => {
          for (const p of list) {
            if (p.keyMissing) {
              flag(p.id);
              continue;
            }
            try {
              const status = await api.checkProfile(p.keyPath, p.githubLogin);
              if (status === "broken") flag(p.id);
            } catch {
              /* network/other — leave the profile unflagged */
            }
          }
        };
        const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
        idle(() => void run());
      })
      .catch(() => setLoading(false));

    api.reconcileActive()
      .then((s) => {
        if (s.matchedId) {
          setActiveId(s.matchedId);
          return s.matchedId;
        }
        if (s.unmanagedLogin || s.keyPath || s.gitEmail) {
          setUntracked({
            login: s.unmanagedLogin,
            email: s.gitEmail,
            keyPath: s.keyPath,
          });
        }
        return api.getActiveProfile()
          .then((id) => {
            setActiveId(id);
            return id;
          })
          .catch(() => null);
      })
      .catch(() => null);
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
    try {
      for (const p of profiles) {
        await handleRefresh(p.id).catch(() => {});
      }
    } finally {
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

  function completeWelcome() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    // First run: if config already has a GitHub identity, hand the onboarding
    // Add Profile step its key so it lands pre-synced and ready to save.
    openAdd(untracked?.keyPath ?? "");
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

  const showLayout = screen !== "welcome" && screen !== "add-profile";

  return (
    <div className="relative h-screen w-screen bg-neutral-950 rounded-2xl overflow-hidden flex flex-col font-sans">
      <Background />

      {/* Navbar is always visible unless on welcome/add-profile (though we could show it there too, let's keep it clean) */}
      {showLayout && (
        <Navbar
          onAdd={() => openAdd()}
          onRefresh={handleRefreshAll}
          refreshing={refreshingAll}
          onSettings={() => setScreen("settings")}
        />
      )}

      <div className="relative flex min-h-0 flex-1">
        {showLayout && (
          <Sidebar
            activePage={screen}
            onNavigate={(page) => setScreen(page as Screen)}
            onOpenGitHub={handleOpenGitHub}
            onOpenSSH={handleOpenSSH}
            onRefreshAll={handleRefreshAll}
            refreshingAll={refreshingAll}
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
              untracked={untracked}
              onAdd={() => openAdd()}
              onImport={handleImport}
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
