import type { ReactNode } from "react";
import { ArrowSquareOut, type Icon } from "@phosphor-icons/react";
import { cn } from "../../utils/cn";

type SidebarButtonProps = {
  icon: Icon;
  label: ReactNode;
  onClick: () => void;
  /** The current page: highlighted. */
  active?: boolean;
  /** Opens something outside the app: shows a trailing arrow. */
  external?: boolean;
};

/** A navigation entry or quick action in the sidebar. */
export function SidebarButton({
  icon: ButtonIcon,
  label,
  onClick,
  active = false,
  external = false,
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer",
        active
          ? "bg-white/6 text-primary-300 font-medium"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/3"
      )}
    >
      <ButtonIcon size={18} weight="regular" className="shrink-0" />
      <span className="truncate">{label}</span>
      {external && <ArrowSquareOut size={12} className="ml-auto shrink-0" />}
    </button>
  );
}
