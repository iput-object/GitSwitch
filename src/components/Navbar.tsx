import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus, ArrowsClockwise, BellIcon, Minus, X } from "@phosphor-icons/react";

import logo from "../assets/logo.svg";
import type { Untracked } from "../App";

type NavbarProps = {
  onAdd: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  /** An in-use identity that isn't saved yet, or null when there's nothing. */
  notification: Untracked | null;
  onImport: () => void;
};

export default function Navbar({
  onAdd,
  onRefresh,
  refreshing,
  notification,
  onImport,
}: NavbarProps) {
  const appWindow = getCurrentWindow();
  const [open, setOpen] = useState(false);
  const hasNotification = !!notification;

  // Spin starts the instant a refresh begins, but we let it finish the current
  // rotation before stopping (at an animation-iteration boundary) so the icon
  // never snaps back to 0deg mid-turn.
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    if (refreshing) setSpinning(true);
  }, [refreshing]);

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

        <button
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh profiles"
          className="w-7 h-7 flex items-center justify-center rounded-md
                     text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                     transition-colors disabled:hover:bg-transparent"
        >
          <ArrowsClockwise
            size={14}
            weight="bold"
            className={refreshing || spinning ? "animate-spin" : ""}
            onAnimationIteration={() => {
              if (!refreshing) setSpinning(false);
            }}
          />
        </button>

        {/* Notifications: red dot when an in-use identity isn't saved yet */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Notifications"
            className="relative w-7 h-7 flex items-center justify-center rounded-md
                       text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                       transition-colors"
          >
            <BellIcon size={14} weight="bold" />
            {hasNotification && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
            )}
          </button>

          {open && (
            <>
              {/* Click-away backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div
                className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-white/10
                           bg-neutral-900/95 p-3 shadow-xl shadow-black/40 backdrop-blur"
              >
                {hasNotification ? (
                  <div className="text-left">
                    <div className="text-xs font-medium text-neutral-100">
                      In use, not added yet
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-400">
                      {notification?.login
                        ? `@${notification.login}`
                        : notification?.email}{" "}
                      is your current identity.
                    </div>
                    <button
                      onClick={() => {
                        onImport();
                        setOpen(false);
                      }}
                      className="mt-2.5 w-full rounded-full bg-linear-to-br from-primary-400 to-primary-500
                                 px-3 py-1.5 text-xs font-semibold text-neutral-950
                                 transition-[filter] hover:brightness-105"
                    >
                      Add account
                    </button>
                  </div>
                ) : (
                  <p className="py-2 text-center text-xs text-neutral-500">
                    You&apos;re all caught up.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

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
