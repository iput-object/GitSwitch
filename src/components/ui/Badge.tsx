import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

const TONES = {
  accent: "bg-primary-400/10 text-primary-300/90",
  danger: "bg-rose-500/15 text-rose-300",
} as const;

/** Small status pill ("SSH active", "won't work"). */
export function Badge({
  tone,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn("rounded-xl px-2 py-0.5 text-[10px] font-medium", TONES[tone])}
    >
      {children}
    </span>
  );
}
