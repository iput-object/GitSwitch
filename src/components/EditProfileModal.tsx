import { motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { StoredProfile } from "../services/tauri";

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

  async function save() {
    setSaving(true);
    try {
      await onUpdate(profile.id, name, email);
      onClose();
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
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Profile</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-400/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">
              Email Address
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-primary-400/50"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
