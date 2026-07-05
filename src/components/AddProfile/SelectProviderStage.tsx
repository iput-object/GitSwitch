import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { Provider } from "../../services/tauri";
import { ProviderIcon } from "../ProviderIcon";
import CustomProviderForm from "./CustomProviderForm";
import { CaretLeft, CaretRight, Plus, X } from "@phosphor-icons/react";

type SelectProviderStageProps = {
  providers: Provider[];
  onSelect: (providerId: string) => void;
  onAddCustomProvider: (p: Provider) => void;
  onError: (err: string) => void;
  onCancel?: () => void;
};

export default function SelectProviderStage({
  providers,
  onSelect,
  onAddCustomProvider,
  onError,
  onCancel,
}: SelectProviderStageProps) {
  const reduce = useReducedMotion();
  const [isCustom, setIsCustom] = useState(false);

  const EASE = [0.16, 1, 0.3, 1] as const;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <motion.div
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative flex-1 flex flex-col items-center justify-center px-8 text-center"
    >
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-6 left-6 p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <CaretLeft size={18} weight="bold" />
        </button>
      )}

      <motion.h1
        variants={item}
        className="relative text-3xl font-semibold text-neutral-50 mb-3"
      >
        Choose your Provider
      </motion.h1>
      <motion.p
        variants={item}
        className="relative max-w-[340px] text-sm leading-relaxed text-neutral-400 mb-8"
      >
        Select where you want to host your repositories. We'll set up your keys
        specifically for this provider.
      </motion.p>

      <motion.div variants={item} className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="group relative flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.03] text-left transition-all hover:bg-white/[0.06] hover:border-white/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-br from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-transparent transition-all duration-300" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/20 text-neutral-200 group-hover:text-primary-300 transition-colors">
                <ProviderIcon kind={p.kind} size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-neutral-200 text-sm">{p.name}</span>
                <span className="text-xs text-neutral-500">{p.host}</span>
              </div>
            </div>
            <CaretRight
              size={16}
              weight="bold"
              className="relative text-neutral-500 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0"
            />
          </button>
        ))}

        <button
          onClick={() => setIsCustom(true)}
          className="group relative flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/10 bg-transparent text-neutral-400 transition-all hover:bg-white/[0.02] hover:border-white/20 hover:text-neutral-200"
        >
          <Plus size={16} weight="bold" />
          <span className="font-medium text-sm">Add Custom / Self-hosted</span>
        </button>
      </motion.div>

      {isCustom && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCustom(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Custom Provider</h2>
              <button 
                onClick={() => setIsCustom(false)} 
                className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <CustomProviderForm onAdd={(p) => { onAddCustomProvider(p); onSelect(p.id); }} onError={onError} />
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
