import * as React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Users,
  Key,
  Gear,
  GithubLogo,
  Folder,
  ArrowsClockwise,
  ArrowSquareOut,
} from "@phosphor-icons/react";

type SidebarProps = {
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenGitHub: () => void;
  onOpenSSH: () => void;
  onRefreshAll: () => void;
  refreshingAll?: boolean;
};

const navItems = [
  { label: "Profiles", icon: Users, page: "profiles" },
  { label: "SSH Keys", icon: Key, page: "ssh-keys" },
  { label: "Settings", icon: Gear, page: "settings" },
];

export default function Sidebar({
  activePage,
  onNavigate,
  onOpenGitHub,
  onOpenSSH,
  onRefreshAll,
  refreshingAll,
}: SidebarProps) {
  const [appVersion, setAppVersion] = React.useState("0.1.0");
  const [updateAvailable, setUpdateAvailable] = React.useState<any>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    import('@tauri-apps/api/app').then(m => m.getVersion().then(setAppVersion)).catch(console.error);

    import('@tauri-apps/plugin-updater').then(async (m) => {
      try {
        const update = await m.check();
        if (update) {
          setUpdateAvailable(update);
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    }).catch(console.error);
  }, []);

  const handleUpdateClick = async () => {
    if (!updateAvailable) return;
    setIsUpdating(true);
    try {
      await updateAvailable.downloadAndInstall();
      alert("Update installed! Please restart GitSwitch to apply the new version.");
    } catch (e) {
      console.error(e);
      alert("Failed to install update.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <aside className="flex h-full w-56 flex-col border-r border-white/6 bg-white/2 px-3 py-4">
      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-white/6 text-primary-300 font-medium"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/3"
              }`}
            >
              <item.icon size={18} weight="regular" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="mt-6">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
          Quick Actions
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onOpenGitHub}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-400 transition-colors cursor-pointer hover:text-neutral-200 hover:bg-white/3"
          >
            <GithubLogo size={18} weight="regular" className="shrink-0" />
            <span className="truncate">Open GitHub</span>
            <ArrowSquareOut size={12} className="ml-auto shrink-0" />
          </button>

          <button
            onClick={onOpenSSH}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-400 transition-colors cursor-pointer hover:text-neutral-200 hover:bg-white/3"
          >
            <Folder size={18} weight="regular" className="shrink-0" />
            <span className="truncate">Open SSH Folder</span>
            <ArrowSquareOut size={12} className="ml-auto shrink-0" />
          </button>

          <button
            onClick={onRefreshAll}
            disabled={refreshingAll}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-400 transition-colors cursor-pointer hover:text-neutral-200 hover:bg-white/3"
          >
            <ArrowsClockwise
              size={18}
              weight="regular"
              className={`shrink-0 ${refreshingAll ? "animate-spin" : ""}`}
            />
            <span className="truncate">Refresh Profiles</span>
          </button>
        </div>
      </div>

      {/* Version info */}
      <div
        className="mt-auto flex items-center gap-2 px-2.5"
      >
        <span className={`h-2 w-2 rounded-full ${updateAvailable ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-300 cursor-pointer hover:underline" onClick={() => openUrl("https://github.com/iput-object/GitSwitch").catch(console.error)}>
            GitSwitch v{appVersion}
          </p>
          {updateAvailable ? (
            <button 
              onClick={handleUpdateClick}
              disabled={isUpdating}
              className="text-[10px] text-amber-400 font-semibold text-left truncate transition hover:brightness-110 disabled:opacity-50"
            >
              {isUpdating ? "Installing..." : "Update Available!"}
            </button>
          ) : (
            <p className="text-[10px] text-neutral-500">Up to date</p>
          )}
        </div>
      </div>
    </aside>
  );
}
