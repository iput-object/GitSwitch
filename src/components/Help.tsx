import { openUrl } from "@tauri-apps/plugin-opener";
import { CaretDown, X } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { topics } from "../assets/help.json";

// Markdown element styling + links that open in the real browser (not the
// Tauri webview). Contributors edit src/help.json; no React/JSX needed.
const md = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <button
      onClick={() => href && openUrl(href).catch(console.error)}
      className="text-primary-300 underline cursor-pointer"
    >
      {children}
    </button>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="text-neutral-400">{children}</code>
  ),
} as const;

export default function Help({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-white/8 bg-neutral-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <p className="text-sm font-medium text-neutral-200">Manual</p>
          <button
            onClick={onClose}
            className="text-neutral-500 transition-colors cursor-pointer hover:text-neutral-200"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="overflow-auto px-2 py-2 text-xs leading-relaxed text-neutral-300">
          {topics.map((t) => (
            <details
              key={t.q}
              className="group border-b border-white/6 last:border-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2.5 font-medium text-neutral-200 transition-colors hover:bg-white/3">
                {t.q}
                <CaretDown
                  size={14}
                  weight="bold"
                  className="shrink-0 text-neutral-500 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-2 pb-3 pt-0.5 text-neutral-300">
                <ReactMarkdown components={md}>{t.a}</ReactMarkdown>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
