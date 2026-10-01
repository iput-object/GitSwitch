import { Plus } from "@phosphor-icons/react";
import logo from "../../assets/logo.svg";
import type { Notice } from "./NoticeItem";
import { NotificationBell } from "./NotificationBell";
import { RefreshButton } from "./RefreshButton";
import { WindowControls } from "./WindowControls";

type NavbarProps = {
  onAdd: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** Things that need the user's attention; empty when all is well. */
  notices: Notice[];
};

export default function Navbar({ onAdd, onRefresh, refreshing, notices }: NavbarProps) {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-11 px-3 select-none bg-transparent shrink-0"
    >
      {/* Left: app identity */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        <img
          src={logo}
          alt="GitSwitch"
          className="h-4.5 w-auto drop-shadow-sm pointer-events-none"
        />
        <span className="text-sm font-medium text-neutral-200 tracking-wide">
          GitSwitch
        </span>
      </div>

      {/* Right: actions + window controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-400/30
                     bg-primary-400/10 px-3 py-1 text-xs font-medium text-primary-300
                     transition-colors hover:bg-primary-400/20"
        >
          <Plus size={13} weight="bold" /> Add Profile
        </button>
        <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />
        <NotificationBell notices={notices} />
        <div className="h-4 w-px bg-white/10" />
        <WindowControls />
      </div>
    </div>
  );
}
