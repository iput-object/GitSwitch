import { useState, useEffect } from "react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { TrayIcon } from "@tauri-apps/api/tray";
import { api } from "../services/tauri";
import { useHideEmail, setHideEmail } from "./Email";
import { Toggle } from "./ui/Toggle";
import { Button } from "./ui/Button";
import { container, item } from "../utils/motion";
import { motion, useReducedMotion } from "motion/react";

type SettingsProps = {
  onClearAllProfiles: () => void;
};

export default function Settings({ onClearAllProfiles }: SettingsProps) {
  const reduce = useReducedMotion();
  const hideEmail = useHideEmail();
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
        {/* Appearance Category */}
        <motion.section variants={item}>
          <div className="mb-3">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Appearance
            </h3>
          </div>

          <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-1">
            <Toggle
              label="Hide email addresses"
              description="Mask the local part of every email (••••••@domain) so it isn't exposed on screen or in screenshots."
              checked={hideEmail}
              onChange={setHideEmail}
            />
          </div>
        </motion.section>

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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteAllProfiles}
                  >
                    Confirm Delete
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete All
                </Button>
              )}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
