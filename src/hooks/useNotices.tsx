import { useMemo } from "react";
import {
  ArrowCircleUp,
  IdentificationCard,
  Key,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import Email from "../components/Email";
import type { Notice } from "../components/navbar/NoticeItem";
import type { AppUpdater, UpdaterStatus } from "./useAppUpdater";
import type { ProfilesStore } from "./useProfiles";

type NoticeActions = {
  onImportIdentity: () => void;
  onReviewProfiles: () => void;
};

function updateNotice(status: UpdaterStatus, updater: AppUpdater): Notice | null {
  switch (status.phase) {
    case "available":
      return {
        id: "update",
        icon: ArrowCircleUp,
        tone: "accent",
        title: `GitSwitch ${status.version} is available`,
        detail: `You're on v${__APP_VERSION__}.`,
        actionLabel: "Download and install",
        onAction: updater.installUpdate,
        keepOpen: true,
      };
    case "downloading":
      return {
        id: "update",
        icon: ArrowCircleUp,
        tone: "accent",
        title: `Downloading GitSwitch ${status.version}`,
        detail: status.percent === null ? "Starting…" : `${status.percent}% downloaded`,
        busy: true,
      };
    case "ready":
      return {
        id: "update",
        icon: ArrowCircleUp,
        tone: "accent",
        title: `GitSwitch ${status.version} is ready`,
        detail: "Restart to finish updating.",
        actionLabel: "Restart now",
        onAction: updater.finishUpdate,
      };
    case "error":
      // A failed background check isn't worth a notice; a failed install is.
      if (!status.version) return null;
      return {
        id: "update",
        icon: WarningCircle,
        tone: "danger",
        title: `Couldn't install GitSwitch ${status.version}`,
        detail: status.reason,
        actionLabel: "Try again",
        onAction: updater.installUpdate,
        keepOpen: true,
      };
    default:
      return null;
  }
}

/** Everything that needs the user's attention, in priority order. */
export function useNotices(
  store: ProfilesStore,
  updater: AppUpdater,
  { onImportIdentity, onReviewProfiles }: NoticeActions
): Notice[] {
  const {
    activeProfile,
    unverifiedSwitch,
    identityDrifted,
    liveGitEmail,
    missingKeyProfiles,
    addableIdentity,
    reapplyActive,
  } = store;

  return useMemo(() => {
    const notices: Notice[] = [];

    const update = updateNotice(updater.status, updater);
    if (update) notices.push(update);

    if (unverifiedSwitch) {
      notices.push({
        id: "switch-unverified",
        icon: WarningCircle,
        tone: "danger",
        title: "Switch didn't fully apply",
        detail: unverifiedSwitch,
        ...(activeProfile && { actionLabel: "Apply again", onAction: reapplyActive }),
      });
    }

    if (identityDrifted && activeProfile) {
      notices.push({
        id: "identity-drift",
        icon: IdentificationCard,
        tone: "warning",
        title: "Git identity changed outside GitSwitch",
        detail: liveGitEmail ? (
          <>
            Global user.email is now <Email value={liveGitEmail} />.
          </>
        ) : (
          "Global user.email is no longer set."
        ),
        actionLabel: `Re-apply ${activeProfile.displayName}`,
        onAction: reapplyActive,
      });
    }

    if (missingKeyProfiles.length > 0) {
      const single = missingKeyProfiles.length === 1;
      notices.push({
        id: "missing-keys",
        icon: Key,
        tone: "danger",
        title: single
          ? "A profile's SSH key is missing"
          : `${missingKeyProfiles.length} profiles' SSH keys are missing`,
        detail: `${missingKeyProfiles.map((p) => p.displayName).join(", ")}. Switching to ${
          single ? "it" : "them"
        } won't work.`,
        actionLabel: "Review profiles",
        onAction: onReviewProfiles,
      });
    }

    if (addableIdentity) {
      notices.push({
        id: "untracked-identity",
        icon: UserPlus,
        tone: "accent",
        title: addableIdentity.providerId
          ? `${addableIdentity.providerId} key in use`
          : "Identity in use",
        detail: (
          <>
            {addableIdentity.login ? (
              `@${addableIdentity.login}`
            ) : (
              <Email value={addableIdentity.email ?? ""} />
            )}{" "}
            is not added yet.
          </>
        ),
        actionLabel: "Add account",
        onAction: onImportIdentity,
      });
    }

    return notices;
    // Store actions are recreated each render; the data deps are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    updater,
    unverifiedSwitch,
    identityDrifted,
    activeProfile,
    liveGitEmail,
    missingKeyProfiles,
    addableIdentity,
  ]);
}
