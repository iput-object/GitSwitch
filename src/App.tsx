import "./styles/global.css";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useMotionValue, useReducedMotion } from "motion/react";
import Background from "./components/Background";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import AddProfile, { type StoredProfile } from "./components/AddProfile";
import Profiles from "./components/Profiles";
import SSHKeys from "./components/SSHKeys";
import Settings from "./components/Settings";

type Screen = "welcome" | "add-profile" | "profiles" | "ssh-keys" | "settings";

type Profile = StoredProfile;

type ActiveState = {
  matchedId: string | null;
  gitName: string | null;
  gitEmail: string | null;
  keyPath: string | null;
  unmanagedLogin: string | null;
};

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [untracked, setUntracked] = useState<Untracked | null>(null);
  const [pendingInput, setPendingInput] = useState("");

  useEffect(() => {
    const profilesP = invoke<Profile[]>("list_profiles")
      .then((list) => {
        setProfiles(list);
        return list;
      })
      .catch(() => [] as Profile[]);

    const activeP = invoke<ActiveState>("reconcile_active")
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
        return invoke<string | null>("get_active_profile")
          .then((id) => {
            setActiveId(id);
            return id;
          })
          .catch(() => null);
      })
      .catch(() => null);

    Promise.all([profilesP, activeP]).then(([list, id]) => {
      if (!id || list.length === 0) return;
      invoke<Profile>("refresh_profile", { id })
        .then((updated) =>
          setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)))
        )
        .catch(() => {});
    });
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

    invoke("activate_profile", { id }).catch(() => {});

    invoke<Profile>("refresh_profile", { id })
      .then((updated) =>
        setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)))
      )
      .catch(() => {});
  }

  function handleDelete(id: string) {
    if (id === activeId) return;
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    invoke("delete_profile", { id }).catch(() => {});
  }

  async function handleRefresh(id: string) {
    const updated = await invoke<Profile>("refresh_profile", { id });
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  async function handleRefreshAll() {
    for (const p of profiles) {
      await handleRefresh(p.id).catch(() => {});
    }
  }

  async function handleUpdateProfile(id: string, displayName: string, gitEmail: string) {
    try {
      await invoke("update_profile_details", { id, displayName, gitEmail });
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
      await invoke("open_ssh_folder");
    } catch (err) {
      alert(String(err));
      console.error(err);
    }
  }

  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function resetPointer() {
    px.set(0);
    py.set(0);
  }

  function completeWelcome() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    openAdd();
  }

  function handleSaveProfile(profile: Profile) {
    setProfiles((prev) => [...prev, profile]);
    setUntracked(null);
    setActiveId((current) => {
      if (current) return current;
      invoke("activate_profile", { id: profile.id }).catch(() => {});
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
    <div
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
      className="relative h-screen w-screen bg-neutral-950 rounded-2xl overflow-hidden flex flex-col font-sans"
    >
      <Background px={px} py={py} />

      {/* Navbar is always visible unless on welcome/add-profile (though we could show it there too, let's keep it clean) */}
      {showLayout && (
        <Navbar 
          onAdd={() => openAdd()}
          onRefresh={handleRefreshAll}
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
