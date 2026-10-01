import { useCallback, useEffect, useRef } from "react";

/**
 * A single restartable timer owned by a component. Scheduling again replaces
 * the pending callback, and unmounting clears it, so a late "copied!" reset or
 * scroll-idle callback never fires into a component that's already gone.
 */
export function useTimeout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(
    (callback: () => void, ms: number) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        callback();
      }, ms);
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
