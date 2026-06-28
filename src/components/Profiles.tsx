import * as React from "react";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  ArrowsClockwise,
  CircleNotch,
  DotsThreeVertical,
  Plus,
  Trash,
  UserCircle,
  PencilSimple,
} from "@phosphor-icons/react";
import type { StoredProfile } from "../services/tauri";
import ActiveProfile from "./ActiveProfile";
import Email from "./Email";
import EditProfileModal from "./EditProfileModal";

type ProfilesProps = {
  profiles: StoredProfile[];
  /** Ids of profiles whose key is missing or no longer accepted by GitHub. */
  broken: Set<string>;
  /** First DB read still in flight — suppresses the empty-state flash. */
  loading: boolean;
  activeId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => Promise<void>;
  onUpdate: (id: string, name: string, email: string) => Promise<void>;
  onOpenGitHub: () => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export default function Profiles({
  profiles,
  broken,
  loading,
  activeId,
  onAdd,
  onSelect,
  onDelete,
  onRefresh,
  onUpdate,
}: ProfilesProps) {
  const reduce = useReducedMotion();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<StoredProfile | null>(
    null,
  );
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function startEditing(p: StoredProfile) {
    setEditingProfile(p);
    setMenuOpenId(null);
  }

  function handleScroll() {
    if (!isScrolling) setIsScrolling(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }

  function handleSelect(id: string) {
    if (id === activeId) return;
    onSelect(id);
  }

  async function handleRefresh(id: string) {
    setMenuOpenId(null);
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  }

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setMenuOpenId(null);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(id);
    onDelete(id);
  }

  const activeProfile = profiles.find((p) => p.id === activeId);
  const otherProfiles = profiles.filter((p) => p.id !== activeId);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="px-6 pt-5 pb-4 shrink-0 border-b border-white/6 z-10 bg-transparent backdrop-blur-md">
        {/* ── Active Profile ────────────────────────────────────── */}
        <ActiveProfile profile={activeProfile} onUpdate={onUpdate} />
      </div>

      <div
        className="flex-1 flex flex-col px-6 py-5 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* ── Saved Profiles header ─────────────────────────────── */}
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Saved Profiles
        </h3>

        {/* ── Profile list / empty state ────────────────────────── */}
        {/* Stay blank until the first DB read finishes, so the "No accounts"
            state doesn't flash before profiles arrive. */}
        {profiles.length === 0 ? (
          loading ? null : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <UserCircle
                size={40}
                weight="thin"
                className="mb-3 text-neutral-600"
              />
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
          )
        ) : otherProfiles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center pb-8">
            <p className="text-xs text-neutral-500 max-w-48 mx-auto">
              No other profiles saved. Add one to switch between accounts.
            </p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial={reduce ? false : "hidden"}
            animate="show"
            className="flex flex-col gap-2"
          >
            {otherProfiles.map((p) => {
              const isRefreshing = refreshingId === p.id;
              const isDeleting = deletingId === p.id;
              const isConfirming = confirmDeleteId === p.id;
              return (
                <motion.div
                  key={p.id}
                  variants={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ring-1 transition-colors
                           ${
                             isConfirming
                               ? "ring-rose-500/30 bg-rose-500/4"
                               : "ring-white/6 bg-white/2 hover:bg-white/4"
                           }`}
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/10">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary-300">
                        {p.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="text-sm font-semibold text-neutral-100">
                        {p.displayName}
                      </span>
                      <span className="text-xs text-neutral-500">
                        @{p.githubLogin}
                      </span>
                      {broken.has(p.id) && (
                        <span
                          title="This account's SSH key is missing or no longer accepted by GitHub. Re-add or regenerate the key."
                          className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
                        >
                          won't work
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-neutral-500">
                      <Email value={p.gitEmail} />
                    </div>
                  </div>

                  {/* Confirm delete state */}
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-300">Delete?</span>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-300
                                 transition-colors hover:bg-rose-500/30"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-400
                                 transition-colors hover:bg-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Switching to a broken profile won't work — offer to
                          delete it instead, in the Switch button's place. */}
                      {broken.has(p.id) ? (
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="rounded-lg border border-rose-400/20 bg-rose-500/8 px-4 py-1.5
                                   text-xs font-medium text-rose-300 transition-colors
                                   hover:bg-rose-500/15"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSelect(p.id)}
                          className="rounded-lg border border-primary-400/20 bg-primary-400/6 px-4 py-1.5
                                   text-xs font-medium text-primary-300 transition-colors
                                   hover:bg-primary-400/15"
                        >
                          Switch
                        </button>
                      )}

                      {/* Kebab menu */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuOpenId(menuOpenId === p.id ? null : p.id)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500
                                   transition-colors hover:bg-white/10 hover:text-neutral-200"
                        >
                          <DotsThreeVertical size={16} weight="bold" />
                        </button>

                        {menuOpenId === p.id && (
                          <>
                            {/* Click-away overlay */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpenId(null)}
                            />
                            <div
                              className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-white/8
                                          bg-neutral-900 py-1 shadow-xl shadow-black/40"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(p);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-300
                                         transition-colors hover:bg-white/6"
                              >
                                <PencilSimple size={13} weight="bold" />
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleRefresh(p.id)}
                                disabled={isRefreshing}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-300
                                         transition-colors hover:bg-white/6 disabled:opacity-50"
                              >
                                <ArrowsClockwise
                                  size={13}
                                  weight="bold"
                                  className={isRefreshing ? "animate-spin" : ""}
                                />
                                Refresh
                              </button>
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleDelete(p.id);
                                }}
                                disabled={isDeleting}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-400
                                         transition-colors hover:bg-white/6 disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <CircleNotch
                                    size={13}
                                    weight="bold"
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash size={13} weight="bold" />
                                )}
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {!isScrolling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 px-6 pt-12 pb-5 bg-linear-to-t from-neutral-950 via-neutral-950/90 to-transparent flex justify-end pointer-events-none"
          >
            <p className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <span className="inline-block h-3 w-3 rounded-full border border-neutral-500 text-center text-[8px] leading-3">
                i
              </span>
              Changes will be applied to your global Git configuration.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
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
