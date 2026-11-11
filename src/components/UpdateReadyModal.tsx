import { motion } from "motion/react";
import { createPortal } from "react-dom";
import { ArrowCircleUp } from "@phosphor-icons/react";
import { Button } from "./ui/Button";

const isWindows = navigator.userAgent.includes("Windows");

/** Asks to apply a downloaded update. "Later" leaves it in the sidebar and bell. */
export default function UpdateReadyModal({
  version,
  onRestart,
  onLater,
}: {
  version: string;
  onRestart: () => void;
  onLater: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onLater}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-ready-title"
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl"
      >
        <div className="mb-2 flex items-center gap-2.5">
          <ArrowCircleUp size={20} weight="bold" className="shrink-0 text-amber-400" />
          <h2 id="update-ready-title" className="text-lg font-semibold text-white">
            GitSwitch {version} is ready
          </h2>
        </div>
        <p className="mb-5 text-sm text-neutral-400">
          {isWindows
            ? "GitSwitch will close while the installer runs, then open again on the new version."
            : "The update is installed. Restart to start using it."}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onLater}>
            Later
          </Button>
          <Button size="sm" onClick={onRestart} autoFocus>
            {isWindows ? "Install now" : "Restart now"}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
