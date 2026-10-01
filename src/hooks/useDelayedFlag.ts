import { useEffect, useState } from "react";

/**
 * True only once `active` has stayed true for `delayMs`, so a fast operation
 * never flashes its loading UI. Drops back to false immediately.
 */
export function useDelayedFlag(active: boolean, delayMs: number) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return shown;
}
