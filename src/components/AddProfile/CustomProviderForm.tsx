import { useState } from "react";
import { api, type Provider } from "../../services/tauri";

type CustomProviderFormProps = {
  onAdd: (provider: Provider) => void;
  onError: (err: string) => void;
};

export default function CustomProviderForm({ onAdd, onError }: CustomProviderFormProps) {
  const [form, setForm] = useState({ name: "", host: "", apiBaseUrl: "", kind: "gitlab" });

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

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <input
        type="text"
        placeholder="Name (e.g. Acme GitLab)"
        value={form.name}
        onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-primary-400/50"
      />
      <input
        type="text"
        placeholder="Host (e.g. gitlab.acme.com)"
        value={form.host}
        onChange={e => setForm(prev => ({...prev, host: e.target.value}))}
        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-primary-400/50"
      />
      <input
        type="text"
        placeholder="API Base URL (e.g. https://gitlab.acme.com/api/v4)"
        value={form.apiBaseUrl}
        onChange={e => setForm(prev => ({...prev, apiBaseUrl: e.target.value}))}
        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-primary-400/50"
      />
      <select
        value={form.kind}
        onChange={e => setForm(prev => ({...prev, kind: e.target.value}))}
        className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-primary-400/50"
      >
        <option value="gitlab">GitLab (Self-hosted)</option>
        <option value="gitea">Gitea</option>
        <option value="custom">Custom (No API)</option>
      </select>
      <button
        onClick={handleAdd}
        disabled={!form.name || !form.host}
        className="mt-2 rounded-md bg-primary-500 py-1.5 text-xs font-semibold text-neutral-950 disabled:opacity-50"
      >
        Add Provider
      </button>
    </div>
  );
}
