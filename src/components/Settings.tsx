import { useState, useEffect } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { TrayIcon } from "@tauri-apps/api/tray";
import { api } from "../services/tauri";
import { motion, useReducedMotion, type Variants } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col pr-4">
        <span className="text-sm font-medium text-neutral-200">{label}</span>
        {description && (
          <span className="text-xs text-neutral-500 mt-0.5">{description}</span>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
          checked ? "bg-primary-500" : "bg-neutral-700"
        }`}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4 bg-white" : "translate-x-0 bg-neutral-300"
          }`}
        />
      </button>
    </div>
  );
}

type SettingsProps = {
  onClearAllProfiles: () => void;
};

export default function Settings({ onClearAllProfiles }: SettingsProps) {
  const reduce = useReducedMotion();
  const [autostart, setAutostart] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTrayIcon, setShowTrayIcon] = useState(() => {
    return localStorage.getItem("gitswitch.showTrayIcon") !== "false";
  });

  useEffect(() => {
    isEnabled().then(setAutostart).catch(console.error);
  }, []);

  const handleAutostartChange = async (checked: boolean) => {
    setAutostart(checked);
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
    } catch (err) {
      console.error(err);
      setAutostart(!checked); // revert on failure
    }
  };

  const handleTrayChange = async (checked: boolean) => {
    setShowTrayIcon(checked);
    localStorage.setItem("gitswitch.showTrayIcon", String(checked));
    try {
      const tray = await TrayIcon.getById("main");
      if (tray) {
        await tray.setVisible(checked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllProfiles = async () => {
    try {
      await api.deleteAllProfiles();
      onClearAllProfiles();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-5 overflow-y-auto">
      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="flex flex-col gap-6"
      >
        {/* System Category */}
        <motion.section variants={item}>
          <div className="mb-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              System
            </h3>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-1">
            <Toggle
              label="Autostart on boot"
              description="Automatically launch GitSwitch in the background when you start your computer."
              checked={autostart}
              onChange={handleAutostartChange}
            />

            <div className="h-px bg-white/6 w-full" />

            <Toggle
              label="Show tray icon"
              description="Display the GitSwitch icon in your system notification area."
              checked={showTrayIcon}
              onChange={handleTrayChange}
            />
          </div>
          <div className="my-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Danger
            </h3>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-medium text-neutral-200">Delete All Profiles</span>
                <span className="text-xs text-neutral-500 mt-0.5">This action cannot be undone. All profiles will be permanently deleted.</span>
              </div>
              {confirmDelete ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllProfiles}
                    className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="shrink-0 rounded-md border border-red-500/50 bg-transparent px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Delete All
                </button>
              )}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
