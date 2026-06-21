import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  ArrowsClockwise,
  CircleNotch,
  DownloadSimple,
  Plus,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import type { StoredProfile } from "./AddProfile";
import type { Untracked } from "../App";
import Dashboard from "./Dashboard";

type ProfilesProps = {
  profiles: StoredProfile[];
  activeId: string | null;
  untracked: Untracked | null;
  onAdd: () => void;
  onImport: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => Promise<void>;
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
  activeId,
  untracked,
  onAdd,
  onImport,
  onSelect,
  onDelete,
  onRefresh,
}: ProfilesProps) {
  const reduce = useReducedMotion();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleSelect(id: string) {
    if (id === activeId) return;
    onSelect(id);
  }

  async function handleRefresh(id: string) {
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
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(id);
    onDelete(id);
  }

  const alreadyTracked =
    !!untracked?.login &&
    profiles.some((p) => p.githubLogin === untracked.login);
  const showImport =
    !!untracked && (!!untracked.login || !!untracked.email) && !alreadyTracked;

  return (
    <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto">
      {/* ── Dashboard ───────────────────────────────────────────── */}
      {profiles.length > 0 && (
        <>
          <Dashboard profiles={profiles} activeId={activeId} />
          <div className="my-4 h-px bg-white/[0.06]" />
        </>
      )}

      {/* ── Section header ──────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Profiles
        </h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5
                     text-xs font-medium text-cyan-300 ring-1 ring-white/10
                     transition-colors hover:bg-white/10"
        >
          <Plus size={13} weight="bold" /> Add
        </button>
      </div>

      {/* ── Import banner ───────────────────────────────────────── */}
      {showImport && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-neutral-100">
              In use, not added yet
            </div>
            <div className="truncate text-xs text-neutral-400">
              {untracked?.login
                ? `@${untracked.login}`
                : untracked?.email}{" "}
              is your current identity.
            </div>
          </div>
          <button
            onClick={onImport}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-linear-to-br
                       from-sky-400 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-neutral-950
                       transition-[filter] hover:brightness-105"
          >
            <DownloadSimple size={13} weight="bold" /> Import
          </button>
        </div>
      )}



      {/* ── Profile list / empty state ──────────────────────────── */}
      {profiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <UserCircle size={40} weight="thin" className="mb-3 text-neutral-600" />
          <p className="text-sm text-neutral-400">No accounts yet.</p>
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-linear-to-br
                       from-sky-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-neutral-950
                       transition-[filter] hover:brightness-105"
          >
            <Plus size={15} weight="bold" /> Add an account
          </button>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          className="flex flex-col"
        >
          {profiles.filter((p) => p.id !== activeId).map((p) => {
            const isRefreshing = refreshingId === p.id;
            const isDeleting = deletingId === p.id;
            return (
              <motion.div
                key={p.id}
                variants={item}
                onClick={() => handleSelect(p.id)}
                className="flex items-center gap-3 border-b border-white/[0.04] px-1 py-3
                           cursor-pointer transition-colors hover:bg-white/[0.03]"
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                  {p.avatar ? (
                    <img
                      src={p.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-cyan-300">
                      {p.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-medium text-neutral-100">
                    {p.displayName}
                  </span>
                  <div className="truncate text-xs text-neutral-500">
                    @{p.githubLogin} · {p.gitEmail}
                    {p.publicRepos != null && <> · {p.publicRepos} repos</>}
                    {p.commits != null && p.commits > 0 && <> · {p.commits} commits</>}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh(p.id);
                        }}
                        disabled={isRefreshing}
                        aria-label="Update from GitHub"
                        title="Refresh"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500
                                   transition-colors hover:bg-white/10 hover:text-neutral-200 disabled:opacity-50"
                      >
                        <ArrowsClockwise
                          size={13}
                          weight="bold"
                          className={isRefreshing ? "animate-spin" : ""}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        onBlur={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        aria-label={confirmDeleteId === p.id ? "Confirm delete" : "Remove account"}
                        title={confirmDeleteId === p.id ? "Click again to confirm" : "Delete"}
                        className={`flex items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
                          confirmDeleteId === p.id
                            ? "h-6 gap-1 px-1.5 bg-rose-500/15 text-rose-400"
                            : "h-6 w-6 text-neutral-500 hover:bg-rose-500/15 hover:text-rose-400"
                        }`}
                      >
                        {isDeleting ? (
                          <CircleNotch size={13} weight="bold" className="animate-spin" />
                        ) : (
                          <Trash size={13} weight="bold" />
                        )}
                        {confirmDeleteId === p.id && !isDeleting && (
                          <span className="text-[10px] font-medium">Delete?</span>
                        )}
                      </button>
                    </>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
