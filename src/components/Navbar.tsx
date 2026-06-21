import { getCurrentWindow } from "@tauri-apps/api/window";
import { GithubLogo, Minus, X } from "@phosphor-icons/react";

export default function Navbar() {
  const appWindow = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-11 px-3 select-none bg-transparent"
    >
      {/* Left: app identity */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        <GithubLogo size={16} weight="fill" className="text-neutral-200" />
        <span className="text-sm font-medium text-neutral-200 tracking-wide">
          GitSwitch
        </span>
      </div>

      {/* Right: window controls */}
      <div className="flex items-center gap-1">
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
          onClick={() => appWindow.close()}
          aria-label="Close"
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
