import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";

type HostInfo = {
  username: string;
  avatar: string | null;
};

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
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Welcome({ onContinue }: WelcomeProps) {
  const reduce = useReducedMotion();
  const [host, setHost] = useState<HostInfo>({
    username: "there",
    avatar: null,
  });

  useEffect(() => {
    invoke<HostInfo>("get_host_info")
      .then(setHost)
      .catch(() => {
        /* keep the friendly default */
      });
  }, []);

  const display =
    host.username && host.username !== "there"
      ? host.username.charAt(0).toUpperCase() + host.username.slice(1)
      : "there";

  // --- Pointer field: drives parallax + avatar tilt (motion values, never state) ---
  const px = useMotionValue(0); // -0.5 .. 0.5 across the surface
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 120, damping: 20, mass: 0.4 });

  const avatarRotY = useTransform(sx, (v) => v * 16); // deg
  const avatarRotX = useTransform(sy, (v) => v * -16);
  const avatarShiftX = useTransform(sx, (v) => v * 10);
  const avatarShiftY = useTransform(sy, (v) => v * 10);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function handlePointerLeave() {
    px.set(0);
    py.set(0);
  }

  // --- Magnetic Continue button ---
  const bx = useMotionValue(0);
  const by = useMotionValue(0);
  const bsx = useSpring(bx, { stiffness: 220, damping: 14, mass: 0.3 });
  const bsy = useSpring(by, { stiffness: 220, damping: 14, mass: 0.3 });

  function handleBtnMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    bx.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    by.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  }
  function handleBtnLeave() {
    bx.set(0);
    by.set(0);
  }

  return (
    <motion.div
      data-tauri-drag-region
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center
                 overflow-hidden px-8 text-center [perspective:1000px]"
    >
      {/* Avatar with pointer-driven 3D tilt */}
      <motion.div
        variants={item}
        style={{
          rotateX: avatarRotX,
          rotateY: avatarRotY,
          x: avatarShiftX,
          y: avatarShiftY,
        }}
        className="relative mb-6 [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 rounded-full bg-sky-400/30 blur-xl" />
        <div
          className="relative flex h-20 w-20 items-center justify-center overflow-hidden
                     rounded-full bg-neutral-800 ring-2 ring-sky-400/40
                     ring-offset-2 ring-offset-neutral-950"
        >
          {host.avatar ? (
            <img
              src={host.avatar}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="bg-linear-to-br from-sky-200 to-cyan-400 bg-clip-text text-2xl font-semibold text-transparent">
              {initials(host.username)}
            </span>
          )}
        </div>
      </motion.div>

      <motion.p
        variants={item}
        className="relative mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300/80"
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

      {/* Magnetic CTA. Entrance on the wrapper, magnetism on the button. */}
      <motion.div variants={item}>
        <motion.button
          onClick={onContinue}
          onPointerMove={handleBtnMove}
          onPointerLeave={handleBtnLeave}
          style={{ x: bsx, y: bsy }}
          whileTap={{ scale: 0.97 }}
          className="group relative inline-flex items-center gap-2 overflow-hidden
                     rounded-full bg-linear-to-br from-sky-400 to-cyan-500 px-7 py-3
                     text-sm font-semibold text-neutral-950
                     transition-[filter] hover:brightness-105"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative">Continue</span>
          <ArrowRight
            weight="bold"
            size={15}
            className="relative transition-transform group-hover:translate-x-0.5"
          />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
