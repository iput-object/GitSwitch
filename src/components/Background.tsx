import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

type BackgroundProps = {
  /** Normalized pointer position (-0.5 .. 0.5) across the window. */
  px: MotionValue<number>;
  py: MotionValue<number>;
};

/**
 * The app-wide ambient background. Lives at the shell level so the entire
 * window, navbar included, shares one surface. Drifts subtly with the pointer.
 */
export default function Background({ px, py }: BackgroundProps) {
  const sx = useSpring(px, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 120, damping: 20, mass: 0.4 });

  const aX = useTransform(sx, (v) => v * 46);
  const aY = useTransform(sy, (v) => v * 46);
  const bX = useTransform(sx, (v) => v * -34);
  const bY = useTransform(sy, (v) => v * -34);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ x: aX, y: aY }}
        className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/15 blur-[110px]"
      />
      <motion.div
        style={{ x: bX, y: bY }}
        className="absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]"
      />
      <motion.div
        style={{ x: bX, y: aY }}
        className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-[100px]"
      />
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-size-[26px_26px] mask-[radial-gradient(circle_at_50%_45%,black,transparent_70%)]" />
    </div>
  );
}
