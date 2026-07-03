import type { Provider } from "../../services/tauri";
import CustomProviderForm from "./CustomProviderForm";

type ProviderPickerProps = {
  providers: Provider[];
  selectedProviderId: string;
  setSelectedProviderId: (id: string) => void;
  isCustom: boolean;
  setIsCustom: (v: boolean) => void;
  onAddCustomProvider: (p: Provider) => void;
  onError: (err: string) => void;
};

export default function ProviderPicker({
  providers,
  selectedProviderId,
  setSelectedProviderId,
  isCustom,
  setIsCustom,
  onAddCustomProvider,
  onError,
}: ProviderPickerProps) {
  return (
    <div className="mt-6 w-full max-w-85 text-left mb-4">
      <span className="block text-xs font-medium text-neutral-400 mb-2">Select Provider</span>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedProviderId(p.id);
              setIsCustom(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selectedProviderId === p.id && !isCustom
                ? "border-primary-500 bg-primary-500/20 text-primary-300"
                : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setIsCustom(true)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            isCustom
              ? "border-primary-500 bg-primary-500/20 text-primary-300"
              : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
          }`}
        >
          Custom / self-hosted
        </button>
      </div>

      {isCustom && (
        <CustomProviderForm onAdd={onAddCustomProvider} onError={onError} />
      )}
    </div>
  );
}
