import { ProviderIcon } from "../ProviderIcon";
import { cn } from "../../utils/cn";

const SIZES = {
  md: {
    box: "h-10 w-10",
    ring: "ring-1",
    initials: "text-xs",
    badge: "h-4 w-4 ring-[1.5px]",
    icon: 10,
  },
  lg: {
    box: "h-16 w-16",
    ring: "ring-2",
    initials: "text-xl",
    badge: "h-6 w-6 ring-2",
    icon: 14,
  },
} as const;

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type ProfileAvatarProps = {
  avatar: string | null;
  name: string;
  size?: keyof typeof SIZES;
  /** Shows the provider's logo as a corner badge when set. */
  providerKind?: string;
  providerName?: string;
};

/** Round account picture (or initials) with an optional provider badge. */
export function ProfileAvatar({
  avatar,
  name,
  size = "md",
  providerKind,
  providerName,
}: ProfileAvatarProps) {
  const s = SIZES[size];
  return (
    <div className={cn("relative shrink-0", s.box)}>
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded-full bg-neutral-800 ring-white/10",
          s.ring
        )}
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center font-semibold text-primary-300",
              s.initials
            )}
          >
            {initialsOf(name)}
          </div>
        )}
      </div>
      {providerKind && (
        <div
          title={providerName}
          className={cn(
            "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-neutral-950 ring-neutral-950",
            s.badge
          )}
        >
          <ProviderIcon kind={providerKind} size={s.icon} />
        </div>
      )}
    </div>
  );
}
