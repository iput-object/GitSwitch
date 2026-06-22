import { useState } from "react";
import { Key, Copy, Check } from "@phosphor-icons/react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { StoredProfile } from "./AddProfile";

const EASE = [0.16, 1, 0.3, 1] as const;
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

type SSHKeysProps = {
  profiles: StoredProfile[];
};

export default function SSHKeys({ profiles }: SSHKeysProps) {
  const reduce = useReducedMotion();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, keyPath: string) => {
    await navigator.clipboard.writeText(keyPath);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-5 overflow-y-auto">
      {profiles.length === 0 ? (
        <div className="flex flex-col gap-2">
          <div className="py-10 text-center text-sm text-neutral-500">
            No SSH keys found. Add a profile first.
          </div>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial={reduce ? false : "hidden"}
          animate="show"
          className="flex flex-col gap-2"
        >
          {profiles.map((p) => (
            <motion.div
              key={p.id}
              variants={item}
              className="flex items-center justify-between rounded-xl border border-white/6 bg-white/2 p-4 hover:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-400/10 text-primary-400">
                  <Key size={20} weight="duotone" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-200">
                    {p.keyPath.split("/").pop()}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Used by @{p.githubLogin}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(p.id, p.keyPath)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-colors"
                >
                  {copiedId === p.id ? (
                    <>
                      <Check size={14} className="text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Path
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
