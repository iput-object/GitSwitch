import { motion, useReducedMotion } from "motion/react";
import logo from "../assets/logo.svg";

/**
 * Full-window loading overlay shown while the app reconciles profiles and the
 * active identity on startup. It only mounts when that initial work runs long
 * enough to be noticeable (see the splash threshold in App), so fast launches
 * never flash it. Fades itself out via AnimatePresence in the shell.
 */
export default function Splash() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      data-tauri-drag-region
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center
                 bg-neutral-950/80 backdrop-blur-sm"
    >
      <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
        {/* Soft glow behind the mark. Opacity-only pulse — animating scale on a
            blurred layer re-rasterizes every frame and stutters on WebKitGTK. */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary-400/30 blur-xl"
          animate={reduce ? undefined : { opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning accent ring. CSS animation (compositor-driven) + a
            will-change hint keeps rotation smooth on WebKitGTK/Linux, where
            JS rAF transforms judder. */}
        <span
          className={`absolute inset-0 rounded-full border-2 border-transparent
                     border-t-primary-300 border-r-primary-400/50 will-change-transform
                     ${reduce ? "" : "animate-spin"}`}
        />

        <img src={logo} alt="GitSwitch" className="relative h-11 w-11" />
      </div>

      <motion.p
        className="text-xs uppercase tracking-[0.2em] text-primary-300/80"
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading
      </motion.p>
    </motion.div>
  );
}
