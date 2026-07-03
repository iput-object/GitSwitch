import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, GithubLogo } from "@phosphor-icons/react";
import { GitlabIcon, BitbucketIcon } from "../icons/ProviderIcons";
import type { GeneratedKey } from "../../services/tauri";

type GeneratedKeyPanelProps = {
  generated: GeneratedKey | null;
  reduce: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const GITHUB_SSH_URL = "https://github.com/settings/ssh/new";

export default function GeneratedKeyPanel({ generated, reduce }: GeneratedKeyPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const key = generated?.publicKey;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; ignore */
    }
  }

  return (
    <AnimatePresence>
      {generated?.publicKey && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="relative my-3 w-full max-w-85 overflow-hidden rounded-xl border border-white/10 bg-white/3 p-3 text-left"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">
              New public key
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-300 hover:text-cyan-200"
            >
              {copied ? (
                <Check size={12} weight="bold" />
              ) : (
                <Copy size={12} weight="bold" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="max-h-12 overflow-y-auto break-all font-mono text-[11px] leading-relaxed text-neutral-400">
            {generated.publicKey}
          </p>
          <div className="mt-3">
            <span className="block text-xs font-medium text-neutral-400 mb-2">Add it to your provider:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openUrl(GITHUB_SSH_URL).catch(() => {})}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                <GithubLogo size={14} weight="fill" /> GitHub
              </button>
              <button
                onClick={() => openUrl("https://gitlab.com/-/profile/keys").catch(() => {})}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                <GitlabIcon className="h-[14px] w-[14px]" /> GitLab
              </button>
              <button
                onClick={() => openUrl("https://bitbucket.org/account/settings/ssh-keys/").catch(() => {})}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                <BitbucketIcon className="h-[14px] w-[14px]" /> Bitbucket
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
