import { useState } from "react";
import {
  ArrowsClockwise,
  CircleNotch,
  DotsThreeVertical,
  PencilSimple,
  Terminal,
  Trash,
} from "@phosphor-icons/react";
import { Dropdown, DropdownItem } from "../ui/Dropdown";

type ProfileActionsMenuProps = {
  /** Offer "Switch SSH only" (hidden when it would be a no-op). */
  canSwitchSshOnly: boolean;
  refreshing: boolean;
  deleting: boolean;
  onSwitchSshOnly: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onDelete: () => void;
};

/** The kebab menu on a saved profile row. */
export function ProfileActionsMenu({
  canSwitchSshOnly,
  refreshing,
  deleting,
  onSwitchSshOnly,
  onEdit,
  onRefresh,
  onDelete,
}: ProfileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  // Every item closes the menu, then acts.
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile actions"
        className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500
                   transition-colors hover:bg-white/10 hover:text-neutral-200"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>

      {open && (
        <Dropdown onClose={() => setOpen(false)} className="w-36 py-1">
          {canSwitchSshOnly && (
            <DropdownItem icon={Terminal} onClick={choose(onSwitchSshOnly)}>
              Switch SSH only
            </DropdownItem>
          )}
          <DropdownItem icon={PencilSimple} onClick={choose(onEdit)}>
            Edit Profile
          </DropdownItem>
          <DropdownItem
            icon={ArrowsClockwise}
            spinning={refreshing}
            disabled={refreshing}
            onClick={choose(onRefresh)}
          >
            Refresh
          </DropdownItem>
          <DropdownItem
            icon={deleting ? CircleNotch : Trash}
            spinning={deleting}
            disabled={deleting}
            danger
            onClick={choose(onDelete)}
          >
            Delete
          </DropdownItem>
        </Dropdown>
      )}
    </div>
  );
}
