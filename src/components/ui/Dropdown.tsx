import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "../../utils/cn";

const SURFACES = {
  /** Compact action menu (kebab menus). */
  menu: "mt-1 rounded-lg border-white/8 bg-neutral-900",
  /** Roomier floating panel (notifications). */
  panel: "mt-2 rounded-xl border-white/10 bg-neutral-900/95 backdrop-blur",
} as const;

/**
 * A popover anchored under its trigger, with a full-screen click-away layer
 * behind it. Render it inside a `relative` wrapper next to the trigger.
 */
export function Dropdown({
  onClose,
  surface = "menu",
  className,
  children,
}: {
  onClose: () => void;
  surface?: keyof typeof SURFACES;
  /** Size and padding only; the surface sets position and look. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={cn(
          "absolute right-0 top-full z-50 border shadow-xl shadow-black/40",
          SURFACES[surface],
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

/** One row in a Dropdown menu. */
export function DropdownItem({
  icon: ItemIcon,
  spinning,
  danger,
  disabled,
  onClick,
  children,
}: {
  icon: Icon;
  spinning?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-white/6 disabled:opacity-50",
        danger ? "text-rose-400" : "text-neutral-300"
      )}
    >
      <ItemIcon size={13} weight="bold" className={spinning ? "animate-spin" : undefined} />
      {children}
    </button>
  );
}
