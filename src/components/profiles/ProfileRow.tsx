import { motion } from "motion/react";
import type { StoredProfile } from "../../services/tauri";
import { listItem } from "../../utils/motion";
import { cn } from "../../utils/cn";
import Email from "../Email";
import { Badge } from "../ui/Badge";
import { ProfileAvatar } from "../ui/ProfileAvatar";
import { ProfileActionsMenu } from "./ProfileActionsMenu";

type ProfileRowProps = {
  profile: StoredProfile;
  /** The key is missing, so switching to it won't work. */
  broken: boolean;
  /** Its key is wired into its provider's SSH host block. */
  sshActive: boolean;
  canSwitchSshOnly: boolean;
  refreshing: boolean;
  deleting: boolean;
  confirmingDelete: boolean;
  onSwitch: () => void;
  onSwitchSshOnly: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  /** First call asks for confirmation, second (from Confirm) deletes. */
  onDelete: () => void;
  onCancelDelete: () => void;
};

/** One saved (not fully active) profile in the list. */
export function ProfileRow({
  profile: p,
  broken,
  sshActive,
  canSwitchSshOnly,
  refreshing,
  deleting,
  confirmingDelete,
  onSwitch,
  onSwitchSshOnly,
  onEdit,
  onRefresh,
  onDelete,
  onCancelDelete,
}: ProfileRowProps) {
  return (
    <motion.div
      variants={listItem}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 ring-1 transition-colors",
        confirmingDelete
          ? "ring-rose-500/30 bg-rose-500/4"
          : "ring-white/6 bg-white/2 hover:bg-white/4"
      )}
    >
      <ProfileAvatar
        avatar={p.avatar}
        name={p.displayName}
        providerKind={p.providerKind}
        providerName={p.providerName}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sm font-semibold text-neutral-100">{p.displayName}</span>
          <span className="text-xs text-neutral-500">@{p.login}</span>
        </div>
        <div className="truncate text-[11px] text-neutral-500">
          <Email value={p.gitEmail} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {confirmingDelete ? (
          <>
            <span className="text-xs text-rose-300">Delete?</span>
            <button
              onClick={onDelete}
              className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-300
                         transition-colors hover:bg-rose-500/30"
            >
              Confirm
            </button>
            <button
              onClick={onCancelDelete}
              className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-400
                         transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {sshActive && (
              <Badge
                tone="accent"
                title={`Its key is wired into ~/.ssh/config for ${p.providerHost}, so ${p.providerName} auth uses it, but another profile owns your git commit identity.`}
              >
                SSH active
              </Badge>
            )}
            {broken && (
              <Badge
                tone="danger"
                title={`This account's SSH key is missing or no longer accepted by ${p.providerName}. Re-add or regenerate the key.`}
              >
                won't work
              </Badge>
            )}

            {/* Switching to a broken profile won't work, so offer to delete
                it instead, in the Switch button's place. */}
            {broken ? (
              <button
                onClick={onDelete}
                className="rounded-lg border border-rose-400/20 bg-rose-500/8 px-4 py-1.5
                           text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/15"
              >
                Delete
              </button>
            ) : (
              <button
                onClick={onSwitch}
                className="rounded-lg border border-primary-400/20 bg-primary-400/6 px-4 py-1.5
                           text-xs font-medium text-primary-300 transition-colors hover:bg-primary-400/15"
              >
                Switch
              </button>
            )}

            <ProfileActionsMenu
              canSwitchSshOnly={canSwitchSshOnly}
              refreshing={refreshing}
              deleting={deleting}
              onSwitchSshOnly={onSwitchSshOnly}
              onEdit={onEdit}
              onRefresh={onRefresh}
              onDelete={onDelete}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
