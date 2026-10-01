import { type Variants } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Parent that reveals its children one after another. */
export function staggerContainer(stagger: number, delay: number): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

/** Child that fades in while rising `distance` px. */
export function fadeUp(distance: number, duration: number): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
  };
}

// The default page entrance (Welcome, Add Profile, Settings).
export const container = staggerContainer(0.07, 0.08);
export const item = fadeUp(14, 0.5);

// Denser lists (profiles, SSH keys) reveal faster and travel less.
export const listContainer = staggerContainer(0.05, 0.04);
export const listItem = fadeUp(10, 0.4);
