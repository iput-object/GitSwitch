import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowsClockwise, CircleNotch, Key, WarningCircle } from "@phosphor-icons/react";
import { api, type StoredProfile, type GeneratedKey, type ProviderAccount, type Provider } from "../../services/tauri";

import ConfirmStage from "./ConfirmStage";
import SelectProviderStage from "./SelectProviderStage";
import GeneratedKeyPanel from "./GeneratedKeyPanel";
import { ProviderIcon } from "../ProviderIcon";
import { CaretLeft } from "@phosphor-icons/react";

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
  const [account, setAccount] = useState<ProviderAccount | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("github");
  const [step, setStep] = useState<"select" | "connect">("select");
  const [email, setEmail] = useState("");

  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [shake, setShake] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const didAutoSync = useRef(false);

  useEffect(() => {
    api.listProviders().then(setProviders).catch(console.error);
  }, []);

  const kind = useMemo<"empty" | "key" | "path">(() => {
    const t = input.trim();
    if (!t) return "empty";
    if (t.includes("PRIVATE KEY")) return "key";
    return "path";
  }, [input]);

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
      const acc = await api.syncProvider(selectedProviderId, input);
      if (existingLogins.includes(`${acc.login}@${selectedProviderId}`)) {
        setError(`@${acc.login} is already added for this provider.`);
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
        providerId: selectedProviderId,
        login: account.login,
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

  if (account) {
    return (
      <ConfirmStage
        account={account}
        email={email}
        setEmail={setEmail}
        saving={saving}
        error={error}
        onSave={handleSave}
        onCancel={() => setAccount(null)}
        reduce={reduce || false}
      />
    );
  }

  if (step === "select") {
    return (
      <SelectProviderStage
        providers={providers}
        onSelect={(id) => {
          setSelectedProviderId(id);
          setStep("connect");
        }}
        onAddCustomProvider={(p) => setProviders((prev) => [...prev, p])}
        onError={setError}
        onCancel={showCancel ? onCancel : undefined}
      />
    );
  }

  const status = STATUS[kind];
  const activeProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <motion.div
      data-tauri-drag-region
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center px-8 text-center"
    >
      <button
        onClick={() => setStep("select")}
        className="absolute top-6 left-6 p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-10"
      >
        <CaretLeft size={18} weight="bold" />
      </button>

      <motion.div variants={item} className="w-full flex justify-center mb-6">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-200">
          <ProviderIcon kind={activeProvider?.kind || 'github'} size={14} />
          <span className="text-sm font-medium">
            {activeProvider?.name || 'GitHub'}
          </span>
        </div>
      </motion.div>

      <motion.h1
        variants={item}
        className="relative text-2xl font-semibold text-neutral-50"
      >
        Connect your account
      </motion.h1>
      <motion.p
        variants={item}
        className="relative mt-2 mb-8 max-w-[320px] text-sm leading-relaxed text-neutral-400"
      >
        Point GitSwitch at an SSH key, or create a new one. Your name and avatar
        come straight from {activeProvider?.name || 'GitHub'}.
      </motion.p>

      <motion.div variants={item} className="w-full max-w-85 text-left">
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={[
            "flex min-h-12 items-center gap-1.5 rounded-3xl border pl-5 pr-1.5 transition-all duration-200",
            focused && !dragging ? "border-primary-400/60 bg-white/[0.07] ring-4 ring-primary-400/10" : "",
            dragging ? "border-dashed border-primary-400/50 bg-primary-400/5 ring-4 ring-primary-400/10" : "",
            !focused && !dragging ? "border-white/10 bg-white/5" : "",
            shake ? "animate-shake" : "",
          ].filter(Boolean).join(" ")}
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
            placeholder={dragging ? "Drop key file here…" : "Private key, or a path to one"}
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
              {generating ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : <Key size={13} weight="bold" />}
              {generating ? "Creating" : "Create key"}
            </button>
          )}
        </div>

        <div className="mt-3 px-1">
          <AnimatePresence mode="wait">
            {status && (
              <motion.div
                key={kind}
                initial={reduce ? false : { opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5 overflow-hidden"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
                <span className={`text-xs ${status.accent ? "text-primary-300/80" : "text-neutral-500"}`}>
                  {status.text}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <GeneratedKeyPanel generated={generated} provider={activeProvider} reduce={reduce || false} />

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
            : "Sync from " + (providers.find(p => p.id === selectedProviderId)?.name || 'GitHub')}
      </motion.button>

      {error && !syncing && (
        <p className="relative mt-2.5 max-w-85 text-xs leading-relaxed text-rose-300/90">
          {error}
        </p>
      )}
    </motion.div>
  );
}
