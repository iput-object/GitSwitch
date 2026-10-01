import { motion } from "motion/react";
import { ArrowsClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { item } from "../../utils/motion";
import { cn } from "../../utils/cn";

type SyncButtonProps = {
  providerName: string;
  syncing: boolean;
  disabled: boolean;
  /** Turns the button red with a retry label, reason shown underneath. */
  error: string | null;
  onSync: () => void;
};

/** "Sync from <provider>". Errors live on the button, per the design. */
export function SyncButton({ providerName, syncing, disabled, error, onSync }: SyncButtonProps) {
  return (
    <>
      <motion.button
        variants={item}
        onClick={onSync}
        disabled={syncing || disabled}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative inline-flex w-full max-w-85 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-[filter] hover:brightness-105",
          error
            ? "bg-rose-500 text-white"
            : "bg-linear-to-br from-primary-400 to-primary-500 text-neutral-950 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:brightness-100"
        )}
      >
        {syncing ? (
          <CircleNotch size={16} weight="bold" className="animate-spin" />
        ) : error ? (
          <WarningCircle size={16} weight="bold" />
        ) : (
          <ArrowsClockwise size={16} weight="bold" />
        )}
        {syncing ? "Syncing" : error ? "Couldn't sync, try again" : `Sync from ${providerName}`}
      </motion.button>

      {error && !syncing && (
        <p className="relative mt-2.5 max-w-85 text-xs leading-relaxed text-rose-300/90">{error}</p>
      )}
    </>
  );
}
