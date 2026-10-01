import { AnimatePresence, motion } from "motion/react";

/** Footer reminder that switching edits the global git config. Hides while scrolling. */
export function ConfigScopeHint({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 px-6 pt-12 pb-5 bg-linear-to-t from-neutral-950 via-neutral-950/90 to-transparent flex justify-end pointer-events-none"
        >
          <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
            <span className="inline-block h-3 w-3 rounded-full border border-neutral-500 text-center text-[8px] leading-3">
              i
            </span>
            Changes will be applied to your global Git configuration.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
