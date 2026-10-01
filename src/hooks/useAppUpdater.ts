import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdaterStatus =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available"; version: string }
  | { phase: "downloading"; version: string; percent: number | null }
  /** Downloaded. macOS/Linux: installed, waiting for a restart. Windows: the
   *  installer is waiting to run (it closes the app itself). */
  | { phase: "ready"; version: string }
  | { phase: "error"; version: string | null; reason: string };

export type AppUpdater = {
  status: UpdaterStatus;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  finishUpdate: () => Promise<void>;
};

// Windows installers replace the running exe, so the updater plugin launches
// the installer and exits the app on its own. Everywhere else the new version
// is installed in place and only takes effect after a relaunch.
const isWindows = navigator.userAgent.includes("Windows");

// The app mostly lives in the tray, so a check on launch alone goes stale.
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Keep the spinner up for at least a beat so a fast check still reads.
const MIN_CHECK_MS = 700;

const restartPrompt = isWindows
  ? "GitSwitch will close while the installer runs, then open again on the new version."
  : "The update is installed. Restart GitSwitch now to start using it?";

/**
 * App-wide update state. Lives in App (not the sidebar) so it survives screen
 * changes, feeds both the sidebar and the notification bell, and holds a single
 * `Update` handle, closing the old one before replacing it so the Rust-side
 * resource isn't leaked on every re-check.
 */
export function useAppUpdater(): AppUpdater {
  const [status, setStatus] = useState<UpdaterStatus>({ phase: "idle" });
  const updateRef = useRef<Update | null>(null);
  const busyRef = useRef(false); // a check or download is in flight

  const replaceUpdate = useCallback((next: Update | null) => {
    const previous = updateRef.current;
    updateRef.current = next;
    if (previous && previous !== next) previous.close().catch(() => {});
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus({ phase: "checking" });
    const started = Date.now();
    let next: UpdaterStatus = { phase: "idle" };
    try {
      const update = await check({ timeout: 15_000 });
      replaceUpdate(update);
      if (update) next = { phase: "available", version: update.version };
    } catch (error) {
      console.error("Update check failed:", error);
      next = { phase: "error", version: null, reason: String(error) };
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_CHECK_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_CHECK_MS - elapsed));
      }
      busyRef.current = false;
      setStatus(next);
    }
  }, [replaceUpdate]);

  // Apply what's been downloaded: run the installer (Windows, exits the app)
  // or relaunch into the already-installed version.
  const finishUpdate = useCallback(async () => {
    const update = updateRef.current;
    try {
      if (isWindows) {
        if (!update) return;
        await update.install();
      } else {
        await relaunch();
      }
    } catch (error) {
      setStatus({
        phase: "error",
        version: update?.version ?? null,
        reason: String(error),
      });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update || busyRef.current) return;
    busyRef.current = true;
    const version = update.version;
    setStatus({ phase: "downloading", version, percent: null });

    try {
      let total = 0;
      let received = 0;
      await update.download((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          received += event.data.chunkLength;
          const percent = total ? Math.min(100, Math.round((received / total) * 100)) : null;
          setStatus({ phase: "downloading", version, percent });
        }
      });
      // On Windows install() hands off to the installer and exits, so it waits
      // for the user's go-ahead below. Elsewhere install now, restart later.
      if (!isWindows) await update.install();
      setStatus({ phase: "ready", version });
    } catch (error) {
      console.error("Update install failed:", error);
      setStatus({ phase: "error", version, reason: String(error) });
      return;
    } finally {
      busyRef.current = false;
    }

    const restartNow = await ask(restartPrompt, {
      title: `GitSwitch ${version} is ready`,
      kind: "info",
      okLabel: isWindows ? "Install now" : "Restart now",
      cancelLabel: "Later",
    }).catch(() => false);
    // "Later" keeps the ready state, so the sidebar and bell offer it again.
    if (restartNow) await finishUpdate();
  }, [finishUpdate]);

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(() => {
      // Never interrupt a download, or drop a downloaded/installed update.
      if (!updateRef.current) checkForUpdates();
    }, RECHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      replaceUpdate(null);
    };
  }, [checkForUpdates, replaceUpdate]);

  return useMemo(
    () => ({ status, checkForUpdates, installUpdate, finishUpdate }),
    [status, checkForUpdates, installUpdate, finishUpdate],
  );
}
