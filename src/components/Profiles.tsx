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

type ProfilesProps = {
  profiles: StoredProfile[];
  activeId: string | null;
  untracked: Untracked | null;
  onAdd: () => void;
  onImport: () => void;
  onSelect: (id: string) => Promise<void>;
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
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  async function handleSelect(id: string) {
    if (id === activeId || switchingId) return;
    setSwitchError(null);
    setSwitchingId(id);
    try {
      await onSelect(id);
    } catch (e) {
      setSwitchError(String(e));
    } finally {
      setSwitchingId(null);
    }
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
    setDeletingId(id);
    onDelete(id);
  }

  const alreadyTracked =
    !!untracked?.login &&
    profiles.some((p) => p.githubLogin === untracked.login);
  const showImport =
    !!untracked && (!!untracked.login || !!untracked.email) && !alreadyTracked;

  return (
    <div className="flex-1 flex flex-col px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-50">Accounts</h2>
          <p className="text-xs text-neutral-500">
            {activeId
              ? "Pick an account to make it active."
              : "Pick an account to make it active everywhere."}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5
                     text-xs font-medium text-cyan-300 ring-1 ring-white/10
                     transition-colors hover:bg-white/10"
        >
          <Plus size={13} weight="bold" /> Add
        </button>
      </div>

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

      {switchError && (
        <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
          {switchError}
        </p>
      )}

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
          className="flex flex-col gap-2"
        >
          {profiles.map((p) => {
            const isActive = p.id === activeId;
            const isRefreshing = refreshingId === p.id;
            const isDeleting = deletingId === p.id;
            const isSwitching = switchingId === p.id;
            return (
              <motion.div
                key={p.id}
                variants={item}
                onClick={() => handleSelect(p.id)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors ${
                  isActive
                    ? "bg-sky-400/[0.07] ring-sky-400/40"
                    : "cursor-pointer bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]"
                } ${switchingId && !isSwitching ? "opacity-50" : ""}`}
              >
                <div className="relative h-10 w-10 shrink-0">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/10">
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
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-neutral-950 bg-sky-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-neutral-100">
                      {p.displayName}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    @{p.githubLogin} · {p.gitEmail}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {isSwitching ? (
                    <div className="flex h-7 items-center gap-1.5 px-1 text-xs text-cyan-300">
                      <CircleNotch size={14} weight="bold" className="animate-spin" />
                      Switching
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh(p.id);
                        }}
                        disabled={isRefreshing}
                        aria-label="Update from GitHub"
                        title="Update name and avatar from GitHub"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400
                                   transition-colors hover:bg-white/10 hover:text-neutral-100 disabled:opacity-60"
                      >
                        <ArrowsClockwise
                          size={14}
                          weight="bold"
                          className={isRefreshing ? "animate-spin" : ""}
                        />
                      </button>
                      {!isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          disabled={isDeleting}
                          aria-label="Remove account"
                          title="Remove account"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400
                                     opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-300
                                     group-hover:opacity-100 disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <CircleNotch size={14} weight="bold" className="animate-spin" />
                          ) : (
                            <Trash size={14} weight="bold" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
