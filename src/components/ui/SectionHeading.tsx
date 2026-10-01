import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

/** The small uppercase label above a group ("Saved Profiles", "System", …). */
export function SectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider text-neutral-500",
        className
      )}
    >
      {children}
    </h3>
  );
}
