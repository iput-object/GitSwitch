import * as React from "react";
import { X } from "@phosphor-icons/react";
import { api } from "../services/tauri";

export default function GitConfig({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .gitConfig()
      .then((cfg) => setConfig(cfg || "(empty)"))
      .catch((e) => setConfig(String(e)));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-xl border border-white/8 bg-neutral-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <p className="text-sm font-medium text-neutral-200">Git Config</p>
          <button
            onClick={onClose}
            className="text-neutral-500 transition-colors cursor-pointer hover:text-neutral-200"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <pre className="overflow-auto px-4 py-3 text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap break-all">
          {config ?? "Loading…"}
        </pre>
      </div>
    </div>
  );
}
