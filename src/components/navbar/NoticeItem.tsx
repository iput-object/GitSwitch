import type { ReactNode } from "react";
import { CircleNotch, type Icon } from "@phosphor-icons/react";

/** One actionable item in the bell menu. */
export type Notice = {
  id: string;
  icon: Icon;
  tone: "accent" | "warning" | "danger";
  title: string;
  detail?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Work is in flight: spin and hide the action. */
  busy?: boolean;
  /** Keep the menu open after the action (e.g. it shows progress in place). */
  keepOpen?: boolean;
};

const TONE_CLASSES: Record<Notice["tone"], string> = {
  accent: "bg-primary-400/10 text-primary-300",
  warning: "bg-amber-400/10 text-amber-300",
  danger: "bg-rose-500/15 text-rose-300",
};

export function NoticeItem({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  const NoticeIcon = notice.icon;
  return (
    <li className="flex gap-2.5 rounded-lg px-2 py-2 text-left">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[notice.tone]}`}
      >
        {notice.busy ? (
          <CircleNotch size={13} weight="bold" className="animate-spin" />
        ) : (
          <NoticeIcon size={13} weight="bold" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-neutral-100">{notice.title}</p>
        {notice.detail && (
          <div className="mt-0.5 wrap-break-word text-[11px] leading-snug text-neutral-400">
            {notice.detail}
          </div>
        )}
        {notice.actionLabel && notice.onAction && !notice.busy && (
          <button
            onClick={() => {
              notice.onAction?.();
              if (!notice.keepOpen) onDone();
            }}
            className="mt-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium
                       text-primary-300 ring-1 ring-white/10 transition-colors hover:bg-white/10"
          >
            {notice.actionLabel}
          </button>
        )}
      </div>
    </li>
  );
}
