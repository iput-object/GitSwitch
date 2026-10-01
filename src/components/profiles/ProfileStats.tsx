import { Fragment } from "react";
import type { StoredProfile } from "../../services/tauri";

/** Repos / followers / commits. Only GitHub exposes these unauthenticated, so
 *  it renders nothing for other providers rather than a row of zeros. */
export function ProfileStats({ profile }: { profile: StoredProfile }) {
  const stats = [
    { label: "repos", value: profile.publicRepos },
    { label: "followers", value: profile.followers },
    { label: "commits", value: profile.commits },
  ];
  if (stats.every((stat) => stat.value == null)) return null;

  return (
    <div className="mt-4 flex items-center gap-6 text-sm text-neutral-500">
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 && <span className="h-4 w-px bg-white/10" />}
          <span>
            <span className="text-base font-semibold text-neutral-200">{stat.value ?? 0}</span>{" "}
            {stat.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
