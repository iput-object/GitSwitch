import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "@phosphor-icons/react";
import type { GeneratedKey, Provider } from "../../services/tauri";
import { ProviderIcon } from "../ProviderIcon";

type GeneratedKeyPanelProps = {
  generated: GeneratedKey | null;
  provider?: Provider;
  reduce: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export default function GeneratedKeyPanel({ generated, provider, reduce }: GeneratedKeyPanelProps) {
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
          className="relative mb-3 w-full max-w-85 overflow-hidden rounded-xl border border-white/10 bg-white/3 p-3 text-left"
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
          <p className="max-h-12 overflow-y-auto break-all font-mono text-[11px] leading-relaxed text-neutral-400 select-text">
            {generated.publicKey}
          </p>
          <div className="mt-3 flex items-center gap-1 pt-1">
            <span className="text-xs font-medium text-neutral-400">Add it to your provider:</span>
            <button
              onClick={() => {
                const host = provider?.host || "github.com";
                let url = `https://${host}/settings/ssh/new`;
                if (provider?.kind === "gitlab") url = `https://${host}/-/profile/keys`;
                else if (provider?.kind === "bitbucket") url = `https://${host}/account/settings/ssh-keys/`;

                openUrl(url).catch(() => {});
              }}
              className="text-xs font-medium text-primary-300 hover:text-primary-200 underline underline-offset-2 transition-colors cursor-pointer"
            >
              click here
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
