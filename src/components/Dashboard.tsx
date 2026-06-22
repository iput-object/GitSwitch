import { motion, useReducedMotion, type Variants } from "motion/react";
import type { StoredProfile } from "./AddProfile";

type DashboardProps = {
  profiles: StoredProfile[];
  activeId: string | null;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

const row: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export default function Dashboard({ profiles, activeId }: DashboardProps) {
  const reduce = useReducedMotion();
  const active = profiles.find((p) => p.id === activeId);

  const repos = active?.publicRepos ?? 0;
  const followers = active?.followers ?? 0;
  const commits = active?.commits ?? 0;

  if (!active) return null;

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      {/* ── Identity row ─────────────────────────────────────── */}
      <motion.div variants={row} className="flex items-center gap-3 mb-4">
        <div className="relative h-11 w-11 shrink-0">
          <div className="h-11 w-11 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/10">
            {active.avatar ? (
              <img
                src={active.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-300">
                {active.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-neutral-950 bg-emerald-400" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-50">
            {active.displayName}
            <span className="ml-1.5 font-normal text-neutral-500">@{active.githubLogin}</span>
          </p>
          <p className="truncate text-xs text-neutral-500">
            {active.gitEmail}
          </p>
        </div>
      </motion.div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <motion.div
        variants={row}
        className="flex items-center gap-5 text-xs text-neutral-500"
      >
        <span>
          <span className="font-semibold text-neutral-200">{repos}</span>{" "}
          repos
        </span>

        <span className="h-3 w-px bg-white/10" />

        <span>
          <span className="font-semibold text-neutral-200">{followers}</span>{" "}
          followers
        </span>

        <span className="h-3 w-px bg-white/10" />

        <span>
          <span className="font-semibold text-neutral-200">{commits}</span>{" "}
          commits
        </span>
      </motion.div>
    </motion.div>
  );
}
