import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { api, type HostInfo } from "../services/tauri";

type WelcomeProps = {
  onContinue: () => void;
};

/** Two-letter initials from an OS username like "ahad" or "ahad.aiman". */
function initials(name: string): string {
  const parts = name
    .replace(/[._\-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export default function Welcome({ onContinue }: WelcomeProps) {
  const reduce = useReducedMotion();
  const [host, setHost] = useState<HostInfo>({
    username: "there",
    avatar: null,
  });

  useEffect(() => {
    api.getHostInfo()
      .then(setHost)
      .catch(() => {
        /* keep the friendly default */
      });
  }, []);

  const display =
    host.username && host.username !== "there"
      ? host.username.charAt(0).toUpperCase() + host.username.slice(1)
      : "there";

  return (
    <motion.div
      data-tauri-drag-region
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center
                 overflow-hidden px-8 text-center"
    >
      {/* Avatar */}
      <motion.div
        variants={item}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-full bg-primary-400/30 blur-xl" />
        <div
          className="relative flex h-20 w-20 items-center justify-center overflow-hidden
                     rounded-full bg-neutral-800 ring-2 ring-primary-400/40
                     ring-offset-2 ring-offset-neutral-950"
        >
          {host.avatar ? (
            <img
              src={host.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="bg-linear-to-br from-primary-200 to-primary-400 bg-clip-text text-2xl font-semibold text-transparent">
              {initials(host.username)}
            </span>
          )}
        </div>
      </motion.div>

      <motion.p
        variants={item}
        className="relative mb-2 text-xs uppercase tracking-[0.2em] text-primary-300/80"
      >
        Welcome back
      </motion.p>
      <motion.h1
        variants={item}
        className="relative mb-3 text-2xl font-semibold text-neutral-50"
      >
        Hi, {display}
      </motion.h1>
      <motion.p
        variants={item}
        className="relative mb-9 max-w-75 text-sm leading-relaxed text-neutral-400"
      >
        Manage every GitHub identity on this machine and switch between them in a
        single click, straight from your tray.
      </motion.p>

      {/* CTA Button */}
      <motion.div variants={item}>
        <button
          onClick={onContinue}
          className="group relative inline-flex items-center gap-2 overflow-hidden
                     rounded-full bg-linear-to-br from-primary-400 to-primary-500 px-7 py-3
                     text-sm font-semibold text-neutral-950 cursor-pointer
                     transition-[filter] hover:brightness-105"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">Continue</span>
          <ArrowRight
            weight="bold"
            size={15}
            className="relative transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </motion.div>
    </motion.div>
  );
}
