import { useState } from "react";
import { motion, type Variants } from "motion/react";
import { ArrowLeft, Check, CircleNotch, WarningCircle, PencilSimple } from "@phosphor-icons/react";
import type { ProviderAccount } from "../../services/tauri";

type ConfirmStageProps = {
  account: ProviderAccount;
  email: string;
  setEmail: (val: string) => void;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onCancel: () => void;
  reduce: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function ConfirmStage({
  account,
  email,
  setEmail,
  saving,
  error,
  onSave,
  onCancel,
  reduce,
}: ConfirmStageProps) {
  const [localName, setLocalName] = useState(account.name || account.login);
  const [editingName, setEditingName] = useState(false);
  const [validationError, setValidationError] = useState<{ field: "name" | "email"; message: string } | null>(null);

  return (
    <motion.div
      data-tauri-drag-region
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center px-8 text-center"
    >
      <motion.div
        variants={item}
        className="relative mb-5 h-20 w-20 overflow-hidden rounded-full bg-neutral-800 ring-2 ring-primary-400/40 ring-offset-2 ring-offset-neutral-950"
      >
        {account.avatarUrl ? (
          <img
            src={account.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary-300">
            {localName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="relative flex flex-col items-center justify-center group w-full max-w-85 px-4">
        {editingName ? (
          <div className="relative w-full flex flex-col items-center">
            <input
              autoFocus
              type="text"
              value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              if (validationError?.field === "name") setValidationError(null);
            }}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className={`w-full text-center text-2xl font-semibold text-neutral-50 bg-transparent border-b outline-none pb-0.5 transition-colors ${
              validationError?.field === "name" ? "border-rose-500/80" : "border-primary-400/50"
            }`}
          />
          {validationError?.field === "name" && (
            <div className="mt-1.5 text-xs font-medium text-rose-400">
              {validationError.message}
            </div>
          )}
        </div>
        ) : (
          <div 
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 cursor-pointer hover:bg-white/5 px-3 py-1 rounded-lg transition-colors max-w-full"
            title="Click to edit display name"
          >
            <h1 className="text-2xl font-semibold text-neutral-50 truncate">
              {localName}
            </h1>
            <PencilSimple size={16} weight="bold" className="text-neutral-500 group-hover:text-primary-300 shrink-0" />
          </div>
        )}
      </motion.div>
      <motion.p
        variants={item}
        className="relative mt-1 text-sm text-primary-300/80"
      >
        @{account.login}
      </motion.p>

      <motion.label
        variants={item}
        className="relative mt-7 block w-full max-w-85 text-left"
      >
        <span className="mb-1.5 block text-xs font-medium text-neutral-400">
          Commit email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (validationError?.field === "email") setValidationError(null);
          }}
          className={`w-full rounded-xl border bg-white/5 px-3.5 py-2.5
                     text-sm text-neutral-100 outline-none transition-colors
                     ${
                       validationError?.field === "email"
                         ? "border-rose-500/50 focus:border-rose-400 focus:bg-rose-500/5"
                         : "border-white/10 focus:border-primary-400/50 focus:bg-white/[0.07]"
                     }`}
        />
        {validationError?.field === "email" ? (
          <span className="mt-1.5 block text-xs text-rose-400">
            {validationError.message}
          </span>
        ) : (
          <span className="mt-1.5 block text-xs text-neutral-500">
            Pre-filled from your provider. Edit if you commit under a different address.
          </span>
        )}
      </motion.label>

      <motion.button
        variants={item}
        onClick={() => {
          if (!localName.trim()) {
            setEditingName(true);
            setValidationError({ field: "name", message: "Display name is required." });
            return;
          }
          if (!email.trim() && !account.suggestedEmail) {
            setValidationError({ field: "email", message: "Commit email is required." });
            return;
          }
          setValidationError(null);
          onSave(localName);
        }}
        disabled={saving}
        whileTap={{ scale: 0.98 }}
        className={`relative mt-6 inline-flex w-full max-w-85 items-center justify-center gap-2
                   rounded-full py-3 text-sm font-semibold transition-[filter] hover:brightness-105 ${
                     error || validationError
                       ? "bg-rose-500 text-white"
                       : "bg-linear-to-br from-primary-400 to-primary-500 text-neutral-950 disabled:opacity-70"
                   }`}
      >
        {saving ? (
          <CircleNotch size={16} weight="bold" className="animate-spin" />
        ) : error || validationError ? (
          <WarningCircle size={16} weight="bold" />
        ) : (
          <Check size={16} weight="bold" />
        )}
        {saving
          ? "Saving"
          : error || validationError
            ? "Couldn't save, fix errors"
            : "Save account"}
      </motion.button>

      {error && !saving && (
        <p className="relative mt-2.5 max-w-85 text-xs leading-relaxed text-rose-300/90">
          {error}
        </p>
      )}

      <motion.button
        variants={item}
        onClick={onCancel}
        className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200"
      >
        <ArrowLeft size={13} weight="bold" /> Use a different key
      </motion.button>
    </motion.div>
  );
}
