import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleNotch, Key } from "@phosphor-icons/react";
import { cn } from "../../utils/cn";

export type KeyInputKind = "empty" | "key" | "path";

/** Is the field empty, a pasted private key, or a path to one? */
export function keyInputKind(value: string): KeyInputKind {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  return trimmed.includes("PRIVATE KEY") ? "key" : "path";
}

const STATUS = {
  empty: null,
  path: { dot: "bg-neutral-500", text: "Reading as a key path.", accent: false },
  key: {
    dot: "bg-primary-400 animate-pulse",
    text: "Private key detected. We'll store it in ~/.ssh.",
    accent: true,
  },
} as const;

type KeyInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Shake the field to flag an error. */
  shake: boolean;
  generating: boolean;
  onCreateKey: () => void;
  reduce: boolean;
};

/**
 * The single "private key or path" field: grows with its content, accepts a
 * dropped key file, offers to create a key while empty, and says how it's
 * reading the input.
 */
export function KeyInput({ value, onChange, shake, generating, onCreateKey, reduce }: KeyInputProps) {
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kind = keyInputKind(value);
  const status = STATUS[kind];

  // Auto-grow to fit pasted keys.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    file.text().then((text) => onChange(text.trim())).catch(() => {});
  }

  return (
    <>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-12 items-center gap-1.5 rounded-3xl border pl-5 pr-1.5 transition-all duration-200",
          focused && !dragging && "border-primary-400/60 bg-white/[0.07] ring-4 ring-primary-400/10",
          dragging && "border-dashed border-primary-400/50 bg-primary-400/5 ring-4 ring-primary-400/10",
          !focused && !dragging && "border-white/10 bg-white/5",
          shake && "animate-shake"
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
            onClick={onCreateKey}
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
    </>
  );
}
