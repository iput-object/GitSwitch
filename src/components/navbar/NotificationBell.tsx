import { useState } from "react";
import { BellIcon } from "@phosphor-icons/react";
import { Dropdown } from "../ui/Dropdown";
import { NoticeItem, type Notice } from "./NoticeItem";

/** Bell with a red dot while anything needs attention; opens the notice list. */
export function NotificationBell({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const hasNotices = notices.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={hasNotices ? `Notifications (${notices.length})` : "Notifications"}
        className="relative w-7 h-7 flex items-center justify-center rounded-md
                   text-neutral-400 hover:bg-white/10 hover:text-neutral-100
                   transition-colors"
      >
        <BellIcon size={14} weight="bold" />
        {hasNotices && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-neutral-950" />
        )}
      </button>

      {open && (
        <Dropdown onClose={() => setOpen(false)} surface="panel" className="w-72 p-1.5">
          {hasNotices ? (
            <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              {notices.map((notice) => (
                <NoticeItem key={notice.id} notice={notice} onDone={() => setOpen(false)} />
              ))}
            </ul>
          ) : (
            <p className="py-3 text-center text-xs text-neutral-500">
              You&apos;re all caught up.
            </p>
          )}
        </Dropdown>
      )}
    </div>
  );
}
