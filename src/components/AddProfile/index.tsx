import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CaretLeft } from "@phosphor-icons/react";
import {
  api,
  type StoredProfile,
  type GeneratedKey,
  type ProviderAccount,
  type Provider,
} from "../../services/tauri";
import { useTimeout } from "../../hooks/useTimeout";
import { container, item } from "../../utils/motion";
import { ProviderIcon } from "../ProviderIcon";
import ConfirmStage from "./ConfirmStage";
import SelectProviderStage from "./SelectProviderStage";
import GeneratedKeyPanel from "./GeneratedKeyPanel";
import { KeyInput, keyInputKind } from "./KeyInput";
import { SyncButton } from "./SyncButton";

type AddProfileProps = {
  initialInput?: string;
  existingLogins?: string[];
  onCancel: () => void;
  onSave: (profile: StoredProfile) => void;
  showCancel?: boolean;
};


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

  const [shake, setShake] = useState(false);
  const shakeReset = useTimeout();

  const didAutoSync = useRef(false);

  useEffect(() => {
    api.listProviders().then(setProviders).catch(console.error);
  }, []);

  const kind = keyInputKind(input);


  useEffect(() => {
    if (initialInput.trim() && !didAutoSync.current) {
      didAutoSync.current = true;
      handleSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInput]);

  function triggerShake() {
    setShake(true);
    shakeReset.schedule(() => setShake(false), 400);
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

  // Editing the field drops a generated key that no longer matches it.
  function handleInputChange(value: string) {
    setInput(value);
    if (generated && value !== generated.keyPath) setGenerated(null);
    if (error) setError(null);
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

  async function handleSave(editedName: string) {
    if (!account) return;
    setError(null);
    setSaving(true);
    try {
      let finalKeyPath = account.keyPath;
      if (account.managed) {
        finalKeyPath = await api.commitKey(account.keyPath, account.login);
        setAccount(prev => prev ? { ...prev, keyPath: finalKeyPath, managed: false } : null);
        setInput(finalKeyPath);
        if (generated) {
          setGenerated({ ...generated, keyPath: finalKeyPath });
        }
      }

      const stored = await api.addProfile({
        displayName: editedName,
        gitName: editedName,
        gitEmail: email.trim() || account.suggestedEmail,
        providerId: selectedProviderId,
        login: account.login,
        avatarUrl: account.avatarUrl,
        keyPath: finalKeyPath,
        publicKey: account.publicKey,
      });
      onSave(stored);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
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
        <KeyInput
          value={input}
          onChange={handleInputChange}
          shake={shake}
          generating={generating}
          onCreateKey={handleCreate}
          reduce={!!reduce}
        />
      </motion.div>

      <GeneratedKeyPanel generated={generated} provider={activeProvider} reduce={reduce || false} />

      <SyncButton
        providerName={activeProvider?.name || "GitHub"}
        syncing={syncing}
        disabled={kind === "empty"}
        error={error}
        onSync={handleSync}
      />
    </motion.div>
  );
}
