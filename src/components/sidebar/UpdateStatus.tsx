import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { AppUpdater, UpdaterStatus } from "../../hooks/useAppUpdater";
import { cn } from "../../utils/cn";

const isWindows = navigator.userAgent.includes("Windows");
const REPO_URL = "https://github.com/iput-object/GitSwitch";

function labelFor(status: UpdaterStatus) {
  switch (status.phase) {
    case "checking":
      return "Checking…";
    case "available":
      return `v${status.version} available, install`;
    case "downloading":
      return status.percent === null ? "Downloading…" : `Downloading ${status.percent}%`;
    case "ready":
      return isWindows ? "Install and restart" : "Restart to update";
    case "error":
      return status.version ? "Couldn't update, try again" : "Couldn't check, try again";
    default:
      return "Up to date";
  }
}

/** App version plus the update state, with the one action that fits it. */
export function UpdateStatus({ updater }: { updater: AppUpdater }) {
  const { status, checkForUpdates, installUpdate, finishUpdate } = updater;
  const busy = status.phase === "checking" || status.phase === "downloading";
  const failed = status.phase === "error";
  // Amber when there's something for the user to do about an update.
  const actionable = status.phase === "available" || status.phase === "ready";
  const label = labelFor(status);
  const hint = failed ? status.reason : label;

  function handleClick() {
    switch (status.phase) {
      case "available":
        return installUpdate();
      case "ready":
        return finishUpdate();
      case "error":
        // Retry whatever failed: the install if we had an update, else the check.
        return status.version ? installUpdate() : checkForUpdates();
      default:
        return checkForUpdates();
    }
  }

  const tone = failed
    ? "text-rose-400"
    : actionable
      ? "text-amber-400"
      : "text-neutral-500";

  return (
    <div className="mt-auto flex items-center gap-2.5 px-1">
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
        title={hint}
        className={cn(
          "shrink-0 transition disabled:cursor-default",
          tone,
          failed || actionable ? "hover:brightness-110" : "hover:text-neutral-300"
        )}
      >
        {busy ? (
          <CircleNotch size={15} weight="bold" className="animate-spin" />
        ) : failed ? (
          <WarningCircle size={15} weight="bold" />
        ) : (
          <ArrowClockwise size={15} weight="bold" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-xs font-medium text-neutral-300 cursor-pointer hover:underline"
          onClick={() => openUrl(REPO_URL).catch(console.error)}
        >
          GitSwitch v{__APP_VERSION__}
        </p>
        {failed || actionable ? (
          <button
            onClick={handleClick}
            title={hint}
            className={cn(
              "block max-w-full truncate text-left text-[10px] font-semibold transition hover:brightness-110",
              tone
            )}
          >
            {label}
          </button>
        ) : (
          <p className="truncate text-[10px] text-neutral-500">{label}</p>
        )}
      </div>
    </div>
  );
}
