import { getCurrentWindow } from "@tauri-apps/api/window";
import { GithubLogo, Plus, ArrowsClockwise, Gear, Minus, X } from "@phosphor-icons/react";

import logoLight from "../assets/logo_light.svg";
import logoDark from "../assets/logo_dark.svg";

type NavbarProps = {
  onAdd: () => void;
  onRefresh: () => void;
  onSettings: () => void;
};

export default function Navbar({ onAdd, onRefresh, onSettings }: NavbarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-11 px-3 select-none bg-transparent shrink-0"
    >
      {/* Left: app identity */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        <picture className="pointer-events-none">
          <source srcSet={logoDark} media="(prefers-color-scheme: light)" />
          <img src={logoLight} alt="GitSwitch" className="h-[18px] w-auto drop-shadow-sm" />
        </picture>
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

        <button
          onClick={onRefresh}
          aria-label="Refresh profiles"
          className="w-7 h-7 flex items-center justify-center rounded-md
                     text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                     transition-colors"
        >
          <ArrowsClockwise size={14} weight="bold" />
        </button>

        <button
          onClick={onSettings}
          aria-label="Settings"
          className="w-7 h-7 flex items-center justify-center rounded-md
                     text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                     transition-colors"
        >
          <Gear size={14} weight="bold" />
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button
          onClick={() => appWindow.minimize()}
          aria-label="Minimize"
          className="w-6 h-6 flex items-center justify-center rounded-md
                     text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                     transition-colors"
        >
          <Minus size={13} weight="bold" />
        </button>

        <button
          onClick={() => appWindow.hide()}
          aria-label="Hide"
          className="w-6 h-6 flex items-center justify-center rounded-md
                     text-neutral-400 hover:bg-rose-500 hover:text-white
                     transition-colors"
        >
          <X size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}
