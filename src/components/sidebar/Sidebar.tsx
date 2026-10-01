import { useState } from "react";
import {
  Users,
  Key,
  Gear,
  GithubLogo,
  Folder,
  FileText,
  Question,
} from "@phosphor-icons/react";
import Help from "../Help";
import GitConfig from "../GitConfig";
import type { AppUpdater } from "../../hooks/useAppUpdater";
import { SectionHeading } from "../ui/SectionHeading";
import { SidebarButton } from "./SidebarButton";
import { UpdateStatus } from "./UpdateStatus";

export type Page = "profiles" | "ssh-keys" | "settings";

type SidebarProps = {
  activePage: string;
  onNavigate: (page: Page) => void;
  onOpenProfile: () => void;
  /** Name of the active profile's provider, for the "Open …" label. */
  activeProviderName: string | null;
  onOpenSSH: () => void;
  updater: AppUpdater;
};

const NAV_ITEMS: { label: string; icon: typeof Users; page: Page }[] = [
  { label: "Profiles", icon: Users, page: "profiles" },
  { label: "SSH Keys", icon: Key, page: "ssh-keys" },
  { label: "Settings", icon: Gear, page: "settings" },
];

export default function Sidebar({
  activePage,
  onNavigate,
  onOpenProfile,
  activeProviderName,
  onOpenSSH,
  updater,
}: SidebarProps) {
  const [showGitConfig, setShowGitConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <aside
      data-tauri-drag-region
      className="flex h-full w-56 flex-col border-r border-white/6 bg-white/2 px-3 py-4"
    >
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarButton
            key={item.page}
            icon={item.icon}
            label={item.label}
            active={activePage === item.page}
            onClick={() => onNavigate(item.page)}
          />
        ))}
      </nav>

      <div className="mt-6">
        <SectionHeading className="mb-2">Quick Actions</SectionHeading>
        <div className="flex flex-col gap-0.5">
          <SidebarButton
            icon={GithubLogo}
            label={`Open ${activeProviderName ?? "provider"}`}
            onClick={onOpenProfile}
            external
          />
          <SidebarButton icon={Folder} label="Open SSH Folder" onClick={onOpenSSH} external />
          <SidebarButton
            icon={FileText}
            label="Show Git Config"
            onClick={() => setShowGitConfig(true)}
          />
          <SidebarButton icon={Question} label="Help" onClick={() => setShowHelp(true)} />
        </div>
      </div>

      <UpdateStatus updater={updater} />

      {showGitConfig && <GitConfig onClose={() => setShowGitConfig(false)} />}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </aside>
  );
}
