import { useEffect, useMemo, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  ArrowLeft,
  ArrowsClockwise,
  Check,
  CircleNotch,
  Copy,
  GithubLogo,
  Key,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  api,
  type StoredProfile,
  type GeneratedKey,
  type GithubAccount,
} from "../services/tauri";

type AddProfileProps = {
  initialInput?: string;
  existingLogins?: string[];
  onCancel: () => void;
  onSave: (profile: StoredProfile) => void;
  showCancel?: boolean;
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

const GITHUB_SSH_URL = "https://github.com/settings/ssh/new";

const STATUS = {
  empty: null,
  path: {
    dot: "bg-neutral-500",
    text: "Reading as a key path.",
    accent: false,
  },
  key: {
    dot: "bg-primary-400 animate-pulse",
    text: "Private key detected — we'll store it in ~/.ssh.",
    accent: true,
  },
} as const;

export default function AddProfile({
  initialInput = "",
  existingLogins = [],
  onCancel,
  onSave,
  showCancel = true,
}: AddProfileProps) {
  const reduce = useReducedMotion();

  const [input, setInput] = useState(initialInput);
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [account, setAccount] = useState<GithubAccount | null>(null);
  const [email, setEmail] = useState("");

  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [shake, setShake] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const didAutoSync = useRef(false);

  const kind = useMemo<"empty" | "key" | "path">(() => {
    const t = input.trim();
    if (!t) return "empty";
    if (t.includes("PRIVATE KEY")) return "key";
    return "path";
  }, [input]);

  // Auto-resize textarea
  function autoResize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoResize();
  }, [input]);

  useEffect(() => {
    if (initialInput.trim() && !didAutoSync.current) {
      didAutoSync.current = true;
      handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInput]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  async function handleCreate() {
    setError(null);
    setGenerating(true);
    try {
      const k = await api.generateSshKey();
      setGenerated(k);
      setInput(k.keyPath);
    } catch (e) {
      setError(String(e));
      triggerShake();
    } finally {
      setGenerating(false);
    }
  }

  async function handleSync() {
    if (!input.trim()) {
      setError("Add a key path or paste a private key first.");
      triggerShake();
      return;
    }
    setError(null);
    setSyncing(true);
    try {
      const acc = await api.syncGithub(input);
      if (existingLogins.includes(acc.login)) {
        setError(`@${acc.login} is already added.`);
        triggerShake();
        return;
      }
      setAccount(acc);
      setEmail(acc.suggestedEmail);
    } catch (e) {
      setError(String(e));
      triggerShake();
    } finally {
      setSyncing(false);
    }
  }

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

  async function handleSave() {
    if (!account) return;
    setError(null);
    setSaving(true);
    try {
      const keyPath = account.managed
        ? await api.commitKey(account.keyPath, account.login)
        : account.keyPath;
      const name = account.name || account.login;
      const stored = await api.addProfile({
        displayName: name,
        gitName: name,
        gitEmail: email.trim() || account.suggestedEmail,
        githubLogin: account.login,
        avatarUrl: account.avatarUrl,
        keyPath,
        publicKey: account.publicKey,
      });
      onSave(stored);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "").trim();
      setInput(text);
      if (generated && text !== generated.keyPath) setGenerated(null);
      if (error) setError(null);
    };
    reader.readAsText(file);
  }

  // ---- Confirm stage ----
  if (account) {
    const name = account.name || account.login;
    return (
      <motion.div
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
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </motion.div>

        <motion.h1
          variants={item}
          className="relative text-2xl font-semibold text-neutral-50"
        >
          {name}
        </motion.h1>
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5
                       text-sm text-neutral-100 outline-none transition-colors
                       focus:border-primary-400/50 focus:bg-white/[0.07]"
          />
          <span className="mt-1.5 block text-xs text-neutral-500">
            Pre-filled from GitHub. Edit if you commit under a different
            address.
          </span>
        </motion.label>

        <motion.button
          variants={item}
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className={`relative mt-6 inline-flex w-full max-w-85 items-center justify-center gap-2
                     rounded-full py-3 text-sm font-semibold transition-[filter] hover:brightness-105 ${
                       error
                         ? "bg-rose-500 text-white"
                         : "bg-linear-to-br from-primary-400 to-primary-500 text-neutral-950 disabled:opacity-70"
                     }`}
        >
          {saving ? (
            <CircleNotch size={16} weight="bold" className="animate-spin" />
          ) : error ? (
            <WarningCircle size={16} weight="bold" />
          ) : (
            <Check size={16} weight="bold" />
          )}
          {saving
            ? "Saving"
            : error
              ? "Couldn't save, try again"
              : "Save account"}
        </motion.button>

        {error && !saving && (
          <p className="relative mt-2.5 max-w-85 text-xs leading-relaxed text-rose-300/90">
            {error}
          </p>
        )}

        <motion.button
          variants={item}
          onClick={() => setAccount(null)}
          className="relative mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <ArrowLeft size={13} weight="bold" /> Use a different key
        </motion.button>
      </motion.div>
    );
  }

  // ---- Input stage ----
  const status = STATUS[kind];

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center px-8 text-center"
    >
      <motion.h1
        variants={item}
        className="relative text-2xl font-semibold text-neutral-50"
      >
        Connect a GitHub account
      </motion.h1>
      <motion.p
        variants={item}
        className="relative mt-2 max-w-[320px] text-sm leading-relaxed text-neutral-400"
      >
        Point GitSwitch at an SSH key, or create a new one. Your name and avatar
        come straight from GitHub.
      </motion.p>

      <motion.div variants={item} className="mt-6 w-full max-w-85 text-left">
        {/* Input pill */}
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            "flex min-h-12 items-center gap-1.5 rounded-full border pl-5 pr-1.5 transition-all duration-200",
            // focus ring
            focused && !dragging
              ? "border-primary-400/60 bg-white/[0.07] ring-4 ring-primary-400/10"
              : "",
            // drag highlight
            dragging
              ? "border-dashed border-primary-400/50 bg-primary-400/5 ring-4 ring-primary-400/10"
              : "",
            // default
            !focused && !dragging ? "border-white/10 bg-white/5" : "",
            // shake on error
            shake ? "animate-shake" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (generated && e.target.value !== generated.keyPath)
                setGenerated(null);
              if (error) setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            placeholder={
              dragging ? "Drop key file here…" : "Private key, or a path to one"
            }
            className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-3
                       font-mono text-[13px] leading-tight text-neutral-100 outline-none
                       placeholder:font-sans placeholder:text-neutral-500"
          />

          {kind === "empty" && (
            <button
              onClick={handleCreate}
              disabled={generating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5
                         px-3 py-1.5 text-xs font-medium text-primary-300 ring-1 ring-white/10
                         transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {generating ? (
                <CircleNotch size={13} weight="bold" className="animate-spin" />
              ) : (
                <Key size={13} weight="bold" />
              )}
              {generating ? "Creating" : "Create key"}
            </button>
          )}
        </div>

        {/* Animated status hint */}
        <div className="mt-1.5 h-4 px-1">
          <AnimatePresence mode="wait">
            {status && (
              <motion.div
                key={kind}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                />
                <span
                  className={`text-xs ${status.accent ? "text-primary-300/80" : "text-neutral-500"}`}
                >
                  {status.text}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Generated key panel */}
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
            <button
              onClick={() => openUrl(GITHUB_SSH_URL).catch(() => {})}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-neutral-100"
            >
              <GithubLogo size={14} weight="fill" /> Add it on GitHub
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        variants={item}
        onClick={handleSync}
        disabled={syncing || kind === "empty"}
        whileTap={{ scale: 0.98 }}
        className={`relative inline-flex w-full max-w-85 items-center justify-center gap-2
                   rounded-full py-3 text-sm font-semibold transition-[filter] hover:brightness-105 ${
                     error
                       ? "bg-rose-500 text-white"
                       : "bg-linear-to-br from-primary-400 to-primary-500 text-neutral-950 " +
                         "disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 disabled:brightness-100"
                   }`}
      >
        {syncing ? (
          <CircleNotch size={16} weight="bold" className="animate-spin" />
        ) : error ? (
          <WarningCircle size={16} weight="bold" />
        ) : (
          <ArrowsClockwise size={16} weight="bold" />
        )}
        {syncing
          ? "Syncing"
          : error
            ? "Couldn't sync, try again"
            : "Sync from GitHub"}
      </motion.button>

      {error && !syncing && (
        <p className="relative mt-2.5 max-w-85 text-xs leading-relaxed text-rose-300/90">
          {error}
        </p>
      )}

      {showCancel && (
        <motion.button
          variants={item}
          onClick={onCancel}
          className="relative mt-3 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200"
        >
          Cancel
        </motion.button>
      )}
    </motion.div>
  );
}
