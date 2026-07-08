import { motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import type { StoredProfile } from "../services/tauri";
import { api } from "../services/tauri";

export default function EditProfileModal({
  profile,
  onUpdate,
  onClose,
}: {
  profile: StoredProfile;
  onUpdate: (id: string, name: string, email: string) => Promise<void>;

  onClose: () => void;
}) {
  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.gitEmail);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<{ field: "name" | "email"; message: string } | null>(null);

  async function save() {
    if (!name.trim()) {
      setValidationError({ field: "name", message: "Display name is required." });
      return;
    }
    if (!email.trim()) {
      setValidationError({ field: "email", message: "Email address is required." });
      return;
    }
    setValidationError(null);
    setSaving(true);
    try {
      await onUpdate(profile.id, name, email);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setSaving(true);
    setValidationError(null);
    try {
      const defaults = await api.getProfileDefaults(profile.id);
      setName(defaults.display_name);
      setEmail(defaults.git_email);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 data-tauri-drag-region className="text-lg font-semibold text-white pointer-events-none">Edit Profile</h2>
          <button
            onClick={() => !saving && onClose()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError?.field === "name") setValidationError(null);
              }}
              disabled={saving}
              className={`w-full rounded-lg border bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors ${
                validationError?.field === "name"
                  ? "border-rose-500/80 focus:border-rose-400"
                  : "border-white/10 focus:border-primary-400/50"
              }`}
            />
            {validationError?.field === "name" && (
              <span className="mt-1.5 block text-xs font-medium text-rose-400">
                {validationError.message}
              </span>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Email Address
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationError?.field === "email") setValidationError(null);
              }}
              disabled={saving}
              className={`w-full rounded-lg border bg-black/20 px-3 py-2 text-sm text-white outline-none transition-colors ${
                validationError?.field === "email"
                  ? "border-rose-500/80 focus:border-rose-400"
                  : "border-white/10 focus:border-primary-400/50"
              }`}
            />
            {validationError?.field === "email" && (
              <span className="mt-1.5 block text-xs font-medium text-rose-400">
                {validationError.message}
              </span>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center gap-3">
          <button
            onClick={resetDefaults}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 cursor-pointer"
          >
            Reset to defaults
          </button>
          <div className="flex justify-end gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
