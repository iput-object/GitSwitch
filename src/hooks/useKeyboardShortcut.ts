import { useEffect, useRef } from "react";

/**
 * Run `handler` on Ctrl/Cmd + `key`. The listener is bound once; a ref keeps
 * it calling the latest handler, so callers don't need to memoize it.
 */
export function useKeyboardShortcut(key: string, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key) {
        event.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key]);
}
