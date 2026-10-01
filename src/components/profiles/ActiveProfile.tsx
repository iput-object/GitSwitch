import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PencilSimple } from "@phosphor-icons/react";
import type { StoredProfile } from "../../services/tauri";
import { fadeUp, staggerContainer } from "../../utils/motion";
import Email from "../Email";
import { ProfileAvatar } from "../ui/ProfileAvatar";
import { SectionHeading } from "../ui/SectionHeading";
import EditProfileModal from "./EditProfileModal";
import { ProfileStats } from "./ProfileStats";

type ActiveProfileProps = {
  profile: StoredProfile | undefined;
  onUpdate: (id: string, name: string, email: string) => Promise<void>;
};

const container = staggerContainer(0.06, 0.02);
const item = fadeUp(6, 0.4);

/** The card for the profile that owns the global git identity. */
export default function ActiveProfile({ profile, onUpdate }: ActiveProfileProps) {
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);

  if (!profile) return null;

  return (
    <motion.div variants={container} initial={reduce ? false : "hidden"} animate="show">
      <motion.div variants={item}>
        <SectionHeading className="mb-3">Active Profile</SectionHeading>
      </motion.div>

      <motion.div variants={item}>
        <div className="rounded-xl border border-primary-400/20 bg-white/2 p-5">
          <div className="flex gap-5">
            <ProfileAvatar
              avatar={profile.avatar}
              name={profile.displayName}
              size="lg"
              providerKind={profile.providerKind}
              providerName={profile.providerName}
            />

            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-neutral-50">
                    {profile.displayName}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-500">
                    @{profile.login}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">
                  <Email value={profile.gitEmail} />
                </div>
                <ProfileStats profile={profile} />
              </div>

              <button
                onClick={() => setEditing(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/3 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/6 hover:text-neutral-100"
              >
                Edit Profile <PencilSimple size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {editing && (
          <EditProfileModal
            profile={profile}
            onUpdate={onUpdate}
            onClose={() => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
