import { useState, useRef, useEffect } from "react";
import { api, type Provider } from "../../services/tauri";
import { CaretDown, Check } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

type CustomProviderFormProps = {
  onAdd: (provider: Provider) => void;
  onCancel?: () => void;
  onError: (err: string) => void;
};

const OPTIONS = [
  { value: "gitlab", label: "GitLab (Self-hosted)" },
  { value: "gitea", label: "Gitea" },
  { value: "custom", label: "Custom (No API)" }
];

export default function CustomProviderForm({ onAdd, onCancel, onError }: CustomProviderFormProps) {
  const [form, setForm] = useState({ name: "", host: "", apiBaseUrl: "", kind: "gitlab" });
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAdd() {
    if (!form.name || !form.host) return;
    try {
      const p = await api.addProvider({
        ...form,
        selfHosted: true,
        apiBaseUrl: form.apiBaseUrl || null
      });
      onAdd(p);
    } catch(e) {
      onError(String(e));
    }
  }

  const selectedLabel = OPTIONS.find(o => o.value === form.kind)?.label;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">Provider Name</label>
        <input
          type="text"
          placeholder="e.g. Acme GitLab"
          value={form.name}
          onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-400/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">Host Domain</label>
        <input
          type="text"
          placeholder="e.g. gitlab.acme.com"
          value={form.host}
          onChange={e => setForm(prev => ({...prev, host: e.target.value}))}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-400/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">API Base URL (Optional)</label>
        <input
          type="text"
          placeholder="e.g. https://gitlab.acme.com/api/v4"
          value={form.apiBaseUrl}
          onChange={e => setForm(prev => ({...prev, apiBaseUrl: e.target.value}))}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-400/50"
        />
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">Provider Type</label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none hover:border-primary-400/50 transition-colors"
        >
          <span>{selectedLabel}</span>
          <CaretDown size={14} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1 z-10 overflow-hidden rounded-lg border border-white/10 bg-neutral-800 shadow-xl"
            >
              <div className="max-h-48 overflow-y-auto py-1">
                {OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setForm(prev => ({...prev, kind: opt.value}));
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-neutral-200 hover:bg-white/10 transition-colors"
                  >
                    <span>{opt.label}</span>
                    {form.kind === opt.value && <Check size={14} className="text-primary-400" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleAdd}
          disabled={!form.name || !form.host}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          Add Provider
        </button>
      </div>
    </div>
  );
}
