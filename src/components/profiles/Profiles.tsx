import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, UserCircle } from "@phosphor-icons/react";
import type { StoredProfile } from "../../services/tauri";
import { useTimeout } from "../../hooks/useTimeout";
import { listContainer } from "../../utils/motion";
import { SectionHeading } from "../ui/SectionHeading";
import ActiveProfile from "./ActiveProfile";
import EditProfileModal from "./EditProfileModal";
import { ProfileRow } from "./ProfileRow";
import { ConfigScopeHint } from "./ConfigScopeHint";

type ProfilesProps = {
  profiles: StoredProfile[];
  /** Ids of profiles whose key is missing. */
  brokenIds: Set<string>;
  /** First DB read still in flight: suppresses the empty-state flash. */
  loading: boolean;
  /** The single fully-active profile (owns the global git commit identity). */
  activeId: string | null;
  /** Profiles whose provider host block currently points at their key. */
  partialIds: Set<string>;
  onAdd: () => void;
  onSelect: (id: string) => void;
  /** Wire only the provider's SSH host block to this profile (no global identity). */
  onSelectPartial: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => Promise<void>;
  onUpdate: (id: string, name: string, email: string) => Promise<void>;
};

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <UserCircle size={40} weight="thin" className="mb-3 text-neutral-600" />
      <p className="text-sm text-neutral-400">No accounts yet.</p>
      <button
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-linear-to-br
                   from-primary-400 to-primary-500 px-4 py-2 text-sm font-semibold text-neutral-950
                   transition-[filter] hover:brightness-105"
      >
        <Plus size={15} weight="bold" /> Add an account
      </button>
    </div>
  );
}

export default function Profiles({
  profiles,
  brokenIds,
  loading,
  activeId,
  partialIds,
  onAdd,
  onSelect,
  onSelectPartial,
  onDelete,
  onRefresh,
  onUpdate,
}: ProfilesProps) {
  const reduce = useReducedMotion();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<StoredProfile | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollIdle = useTimeout();

  function handleScroll() {
    if (!isScrolling) setIsScrolling(true);
    scrollIdle.schedule(() => setIsScrolling(false), 300);
  }

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  }

  // First press asks for confirmation; pressing again (Confirm) deletes.
  function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(id);
    onDelete(id);
  }

  const activeProfile = profiles.find((p) => p.id === activeId);
  const otherProfiles = profiles.filter((p) => p.id !== activeId);

  // "Switch SSH only" is hidden for profiles on the fully-active profile's
  // provider (an SSH-only switch within it makes no sense) and for a profile
  // that is already the SSH-active one. Any other profile, including a sibling
  // on a provider SSH-active for someone else, keeps it.
  const activeFullProviderId = activeProfile?.providerId ?? null;

  function renderList() {
    if (profiles.length === 0) {
      // Stay blank until the first DB read finishes, so the empty state
      // doesn't flash before profiles arrive.
      return loading ? null : <EmptyState onAdd={onAdd} />;
    }
    if (otherProfiles.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center text-center pb-8">
          <p className="text-xs text-neutral-500 max-w-48 mx-auto">
            No other profiles saved. Add one to switch between accounts.
          </p>
        </div>
      );
    }
    return (
      <motion.div
        variants={listContainer}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="flex flex-col gap-2"
      >
        {otherProfiles.map((p) => (
          <ProfileRow
            key={p.id}
            profile={p}
            broken={brokenIds.has(p.id)}
            sshActive={partialIds.has(p.id)}
            canSwitchSshOnly={activeFullProviderId !== p.providerId && !partialIds.has(p.id)}
            refreshing={refreshingId === p.id}
            deleting={deletingId === p.id}
            confirmingDelete={confirmDeleteId === p.id}
            onSwitch={() => onSelect(p.id)}
            onSwitchSshOnly={() => onSelectPartial(p.id)}
            onEdit={() => setEditingProfile(p)}
            onRefresh={() => handleRefresh(p.id)}
            onDelete={() => handleDelete(p.id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="px-6 pt-5 pb-4 shrink-0 border-b border-white/6 z-10 bg-transparent backdrop-blur-md">
        <ActiveProfile profile={activeProfile} onUpdate={onUpdate} />
      </div>

      <div className="flex-1 flex flex-col px-6 py-5 overflow-y-auto" onScroll={handleScroll}>
        <SectionHeading className="mb-3">Saved Profiles</SectionHeading>
        {renderList()}
      </div>

      <ConfigScopeHint visible={!isScrolling} />

      <AnimatePresence>
        {editingProfile && (
          <EditProfileModal
            profile={editingProfile}
            onUpdate={onUpdate}
            onClose={() => setEditingProfile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
