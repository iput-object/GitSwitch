import "./styles/global.css";
import { useEffect, useState } from "react";
import { TrayIcon } from "@tauri-apps/api/tray";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence } from "motion/react";
import { api } from "./services/tauri";
import Background from "./components/Background";
import Splash from "./components/Splash";
import Navbar from "./components/navbar/Navbar";
import Sidebar, { type Page } from "./components/sidebar/Sidebar";
import Welcome from "./components/Welcome";
import AddProfile from "./components/AddProfile";
import Profiles from "./components/profiles/Profiles";
import SSHKeys from "./components/SSHKeys";
import Settings from "./components/Settings";
import { useAppUpdater } from "./hooks/useAppUpdater";
import { useProfiles } from "./hooks/useProfiles";
import { useNotices } from "./hooks/useNotices";
import { useOnboarding, isOnboarded } from "./hooks/useOnboarding";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { useDelayedFlag } from "./hooks/useDelayedFlag";

type Screen = "welcome" | "add-profile" | Page;

function App() {
  const [screen, setScreen] = useState<Screen>(() => (isOnboarded() ? "profiles" : "welcome"));
  const [pendingInput, setPendingInput] = useState("");

  const store = useProfiles({ loadOnMount: screen !== "welcome" });
  const updater = useAppUpdater();
  const onboarding = useOnboarding(screen === "welcome", store.setUntracked);
  // Splash only appears if the first load is slow enough to notice.
  const showSplash = useDelayedFlag(store.loading, 200);

  useEffect(() => {
    if (localStorage.getItem("gitswitch.showTrayIcon") === "false") {
      TrayIcon.getById("main")
        .then((tray) => tray?.setVisible(false))
        .catch(() => {});
    }
  }, []);

  // Ctrl/Cmd+R refreshes all profiles (same as the reload icon).
  useKeyboardShortcut("r", store.refreshAll);

  function openAdd(prefill = "") {
    setPendingInput(prefill);
    setScreen("add-profile");
  }

  const notices = useNotices(store, updater, {
    onImportIdentity: () => openAdd(store.untracked?.keyPath ?? ""),
    onReviewProfiles: () => setScreen("profiles"),
  });

  // Open the active profile's page on its own provider (github.com,
  // gitlab.com, a self-hosted host, …), falling back to the host root.
  function handleOpenProfile() {
    const active = store.activeProfile;
    const base = active ? `https://${active.providerHost}` : "https://github.com";
    openUrl(active?.login ? `${base}/${active.login}` : base).catch(() => {});
  }

  async function handleOpenSSH() {
    try {
      await api.openSshFolder();
    } catch (error) {
      alert(String(error));
    }
  }

  async function completeWelcome() {
    const result = await onboarding.complete();
    if (result.kind === "existing") {
      store.setProfiles(result.profiles);
      store.refreshActiveState();
      setScreen("profiles");
      return;
    }
    openAdd(result.keyPath || store.untracked?.keyPath || "");
  }

  const showLayout = screen !== "welcome" && screen !== "add-profile";

  return (
    <div className="relative h-screen w-screen bg-neutral-950 rounded-2xl overflow-hidden flex flex-col font-sans">
      <Background />

      <AnimatePresence>{showSplash && <Splash />}</AnimatePresence>

      {showLayout && (
        <Navbar
          onAdd={() => openAdd()}
          onRefresh={store.refreshAll}
          refreshing={store.refreshingAll}
          notices={notices}
        />
      )}

      <div className="relative flex min-h-0 flex-1">
        {showLayout && (
          <Sidebar
            activePage={screen}
            onNavigate={setScreen}
            onOpenProfile={handleOpenProfile}
            activeProviderName={store.activeProfile?.providerName ?? null}
            onOpenSSH={handleOpenSSH}
            updater={updater}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {screen === "welcome" && <Welcome onContinue={completeWelcome} />}

          {screen === "add-profile" && (
            <AddProfile
              initialInput={pendingInput}
              existingLogins={store.profiles.map((p) => `${p.login}@${p.providerId}`)}
              showCancel={true}
              onCancel={() => setScreen(store.profiles.length > 0 ? "profiles" : "welcome")}
              onSave={(profile) => {
                store.addSaved(profile);
                setScreen("profiles");
              }}
            />
          )}

          {screen === "profiles" && (
            <Profiles
              profiles={store.profiles}
              brokenIds={store.brokenIds}
              loading={store.loading}
              activeId={store.activeId}
              partialIds={store.partialIds}
              onAdd={() => openAdd()}
              onSelect={store.activate}
              onSelectPartial={store.activatePartial}
              onDelete={store.remove}
              onRefresh={store.refresh}
              onUpdate={store.updateDetails}
            />
          )}

          {screen === "ssh-keys" && <SSHKeys profiles={store.profiles} />}

          {screen === "settings" && (
            <Settings
              onClearAllProfiles={() => {
                store.clearAll();
                setScreen("welcome");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
