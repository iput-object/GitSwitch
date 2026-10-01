import { useEffect, useRef } from "react";
import { api, type StoredProfile } from "../services/tauri";
import { untrackedFrom, type Untracked } from "./useProfiles";

const ONBOARDED_KEY = "gitswitch.onboarded";

/** Returning users skip Welcome (always shown in dev, to iterate on it). */
export const isOnboarded = () => !import.meta.env.DEV && !!localStorage.getItem(ONBOARDED_KEY);

// Resolve `value`, or `fallback` once `ms` passes, whichever comes first. The
// timer is cleared either way so a fast promise doesn't leave it pending.
function withCap<T>(value: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([value, cap]).finally(() => clearTimeout(timer));
}

type OnboardingResult =
  | { kind: "existing"; profiles: StoredProfile[] }
  | { kind: "new"; keyPath: string };

/**
 * First-run flow. While Welcome is showing, probe the machine's current
 * identity so Add Profile can be pre-filled; `complete()` waits for that probe
 * (capped, so a hung SSH call never blocks onboarding).
 */
export function useOnboarding(
  active: boolean,
  onUntracked: (identity: Untracked | null) => void
) {
  // Resolves to the detected key path (or "").
  const probe = useRef<Promise<string>>(Promise.resolve(""));

  useEffect(() => {
    if (!active) return;
    probe.current = api
      .reconcileActive()
      .then((state) => {
        const identity = untrackedFrom(state);
        if (identity) onUntracked(identity);
        return identity?.keyPath ?? "";
      })
      .catch(() => "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function complete(): Promise<OnboardingResult> {
    localStorage.setItem(ONBOARDED_KEY, "1");
    const [keyPath, profiles] = await Promise.all([
      withCap(probe.current, 4000, ""),
      api.listProfiles().catch(() => [] as StoredProfile[]),
      new Promise((resolve) => setTimeout(resolve, 450)), // so the spinner is seen
    ]);
    // Already have accounts? Skip Add Profile and drop straight into the list.
    return profiles.length > 0 ? { kind: "existing", profiles } : { kind: "new", keyPath };
  }

  return { complete };
}
