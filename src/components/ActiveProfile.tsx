import { motion, useReducedMotion, type Variants } from "motion/react";
import { Envelope, ArrowSquareOut } from "@phosphor-icons/react";
import type { StoredProfile } from "../services/tauri";

type ActiveProfileProps = {
  profile: StoredProfile | undefined;
  onOpenGitHub: () => void;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export default function ActiveProfile({
  profile,
  onOpenGitHub,
}: ActiveProfileProps) {
  const reduce = useReducedMotion();

  if (!profile) return null;

  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      <motion.div variants={item}>
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Active Profile
        </h3>
      </motion.div>

      <motion.div variants={item}>
        <div className="rounded-xl border border-primary-400/20 bg-white/2 p-5">
          <div className="flex gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-neutral-800 ring-2 ring-white/10 overflow-hidden">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-primary-300">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-neutral-50">
                      {profile.displayName}
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      ✓ Active
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                    <Envelope size={13} />
                    {profile.gitEmail}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500">
                  <span>
                    <span className="text-base font-semibold text-neutral-200">
                      {profile.publicRepos ?? 0}
                    </span>{" "}
                    repos
                  </span>

                  <span className="h-4 w-px bg-white/10" />

                  <span>
                    <span className="text-base font-semibold text-neutral-200">
                      {profile.followers ?? 0}
                    </span>{" "}
                    followers
                  </span>

                  <span className="h-4 w-px bg-white/10" />

                  <span>
                    <span className="text-base font-semibold text-neutral-200">
                      {profile.commits ?? 0}
                    </span>{" "}
                    commits
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenGitHub}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/3 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/6 hover:text-neutral-100"
              >
                Open GitHub <ArrowSquareOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
