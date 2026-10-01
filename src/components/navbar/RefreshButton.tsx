import { useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

/**
 * Refresh-all icon button. The spin starts the instant a refresh begins but
 * finishes its current rotation before stopping (at an animation-iteration
 * boundary), so the icon never snaps back to 0deg mid-turn.
 */
export function RefreshButton({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    if (refreshing) setSpinning(true);
  }, [refreshing]);

  return (
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
  );
}
