import "./styles/global.css";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useMotionValue, useReducedMotion } from "motion/react";
import Background from "./components/Background";
import Navbar from "./components/Navbar";
import Welcome from "./components/Welcome";
import AddProfile, { type StoredProfile } from "./components/AddProfile";
import Profiles from "./components/Profiles";

type Screen = "welcome" | "add-profile" | "profiles";

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
  // Welcome is a one-time, first-open screen. After the user gets past it
  // once, we remember that and go straight to their profiles next launch.
  // During development we always start on Welcome so it's easy to iterate on.
  const [screen, setScreen] = useState<Screen>(() =>
    !import.meta.env.DEV && localStorage.getItem(ONBOARDED_KEY)
      ? "profiles"
      : "welcome"
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [untracked, setUntracked] = useState<Untracked | null>(null);
  const [pendingInput, setPendingInput] = useState("");

  // On startup, load accounts and reconcile with the live SSH/git identity so
  // manual changes are reflected (and untracked identities can be imported).
  useEffect(() => {
    invoke<Profile[]>("list_profiles")
      .then(setProfiles)
      .catch(() => {
        /* empty list on failure */
      });
    invoke<ActiveState>("reconcile_active")
      .then((s) => {
        if (s.matchedId) {
          setActiveId(s.matchedId);
          return;
        }
        // No live match: keep the last stored selection for the UI, and if
        // something IS in use that we don't track, offer to import it.
        invoke<string | null>("get_active_profile").then(setActiveId).catch(() => {});
        if (s.unmanagedLogin || s.keyPath || s.gitEmail) {
          setUntracked({
            login: s.unmanagedLogin,
            email: s.gitEmail,
            keyPath: s.keyPath,
          });
        }
      })
      .catch(() => {});
  }, []);

  // The tray can switch the active account too; keep the window in sync.
  useEffect(() => {
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

  async function handleSelect(id: string) {
    // The real switch: writes global git config + the managed ~/.ssh/config block.
    await invoke("activate_profile", { id });
    setActiveId(id);
    setUntracked(null); // we now own the github.com identity
  }

  function handleDelete(id: string) {
    if (id === activeId) return; // never remove the active account
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    invoke("delete_profile", { id }).catch(() => {});
  }

  async function handleRefresh(id: string) {
    const updated = await invoke<Profile>("refresh_profile", { id });
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  // Window-wide pointer field, feeding the shared ambient background.
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
    setUntracked(null); // the imported/added identity is now tracked
    // First account added becomes the active one by default (real switch).
    setActiveId((current) => {
      if (current) return current;
      invoke("activate_profile", { id: profile.id }).catch(() => {});
      return profile.id;
    });
    setScreen("profiles");
  }

  return (
    <div
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
      className="relative h-screen w-screen bg-neutral-950 rounded-2xl overflow-hidden flex flex-col"
    >
      <Background px={px} py={py} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {screen !== "welcome" && <Navbar />}

        {screen === "welcome" && (
          <Welcome onContinue={completeWelcome} />
        )}

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
        />
      )}
      </div>
    </div>
  );
}

export default App;
