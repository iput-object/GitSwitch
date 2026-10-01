import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "@phosphor-icons/react";

/** Minimize and close-to-tray, for the undecorated window. */
export function WindowControls() {
  const appWindow = getCurrentWindow();
  return (
    <>
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
    </>
  );
}
